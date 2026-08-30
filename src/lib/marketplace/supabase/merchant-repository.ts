import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/marketplace/slug";
import type { Aesthetic, Category, Interest, Merchant, MerchantAvailability, Product } from "@/lib/marketplace/types";
import type { Database } from "@/lib/supabase/types";

/**
 * The merchant-write side of the data layer — everything a signed-in
 * seller reads/writes about their OWN store and products. Kept separate
 * from supabase/repository.ts (the public, read-only storefront layer)
 * because the concerns genuinely differ: every function here trusts RLS
 * to enforce ownership (products_write_member_or_admin,
 * merchants_update_owner_or_admin, etc. — see 0002_rls.sql/0004), reads
 * DRAFTS and non-approved rows the public layer never should, and is only
 * ever called from Server Actions that have already resolved the current
 * user from the session (never a client-supplied id).
 */

type MerchantRow = Database["public"]["Tables"]["merchants"]["Row"];
type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type ImageRow = Database["public"]["Tables"]["product_images"]["Row"];
type LocationRow = Database["public"]["Tables"]["merchant_locations"]["Row"];

/**
 * Product PLUS its row-level `status` — the public Product type
 * deliberately omits this (a public/customer query only ever returns
 * status='active' rows, so the field would be dead weight there), but the
 * Merchant Dashboard needs to tell "archived" apart from every live
 * availability state, so this owner-scoped layer exposes it.
 */
export interface OwnedProduct extends Product {
  status: "active" | "archived";
}

function toMerchant(row: MerchantRow, location: LocationRow | undefined): Merchant {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    logo: row.logo ?? "",
    description: row.description,
    location: {
      country: "CR",
      region: location?.region ?? undefined,
      city: location?.city ?? undefined,
      addressOptional: location?.address_optional ?? undefined,
    },
    website: row.website ?? undefined,
    whatsapp: row.whatsapp ?? undefined,
    instagram: row.instagram ?? undefined,
    status: row.status,
    createdAt: row.created_at,
  };
}

function toProduct(row: ProductRow, images: ImageRow[], interests: Interest[], aesthetics: Aesthetic[]): OwnedProduct {
  return {
    id: row.id,
    status: row.status,
    merchantId: row.merchant_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    shortDescription: row.short_description,
    category: row.category as Category,
    price: Number(row.price),
    originalPrice: row.original_price === null ? undefined : Number(row.original_price),
    currency: row.currency,
    images: images
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((i) => i.url),
    badges: [],
    interests,
    aesthetics,
    availability: row.availability,
    isDraft: row.is_draft,
    deliveryEstimate: row.delivery_estimate ?? undefined,
    externalPurchaseUrl: row.external_purchase_url ?? undefined,
    whatsappUrl: row.whatsapp_url ?? undefined,
    instagramUrl: row.instagram_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function generateUniqueMerchantSlug(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  base: string,
): Promise<string> {
  const root = slugify(base);
  let candidate = root;
  for (let attempt = 0; attempt < 20; attempt++) {
    const { data, error } = await supabase.from("merchants").select("id").eq("slug", candidate).maybeSingle();
    if (error) {
      const category = categorizeSupabaseError(error);
      console.error("[generateUniqueMerchantSlug] slug lookup failed", { category, ...describeSupabaseError(error) });
      throw new MerchantWriteError(category, error.message, "PRE_RPC");
    }
    if (!data) return candidate;
    candidate = `${root}-${Math.random().toString(36).slice(2, 6)}`;
  }
  // Astronomically unlikely — 20 random collisions in a row — but never loop forever.
  return `${root}-${crypto.randomUUID().slice(0, 8)}`;
}

async function generateUniqueProductSlug(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  merchantId: string,
  base: string,
): Promise<string> {
  const root = slugify(base);
  let candidate = root;
  for (let attempt = 0; attempt < 20; attempt++) {
    const { data, error } = await supabase
      .from("products")
      .select("id")
      .eq("merchant_id", merchantId)
      .eq("slug", candidate)
      .maybeSingle();
    if (error) throw error;
    if (!data) return candidate;
    candidate = `${root}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${root}-${crypto.randomUUID().slice(0, 8)}`;
}

// ---------------------------------------------------------------------------
// Store (merchant) creation / ownership
// ---------------------------------------------------------------------------

export interface CreateStoreInput {
  name: string;
  region?: string;
  city?: string;
  addressOptional?: string;
  whatsapp?: string;
  instagram?: string;
  website?: string;
  logo?: string;
}

/** name/message/code/details/hint only — never the full error object (it can carry request/response internals), never a key/token/cookie or user-entered field values. */
function describeSupabaseError(error: { message: string; code?: string; details?: string; hint?: string }) {
  return { code: error.code, message: error.message, details: error.details, hint: error.hint };
}

/**
 * Postgres's "permission denied for <kind> <name>" message always names the
 * exact object it rejected — that's plain SQLSTATE-adjacent error text, not
 * anything user-entered or secret, so it's safe to pattern-match on
 * server-side to tell "denied to even call the RPC" apart from "denied on
 * auth.uid()" apart from "denied on merchant_locations", etc. Only the
 * mapped, fixed category name below is ever allowed to leave this function —
 * the raw object name is used purely to select which bucket it falls into.
 */
const PERMISSION_TARGET_BY_OBJECT: Record<string, string> = {
  create_merchant_with_owner: "RPC_EXECUTE",
  auth: "SCHEMA_AUTH",
  uid: "SCHEMA_AUTH",
  merchants: "MERCHANTS_INSERT",
  merchant_members: "MERCHANT_MEMBERS_INSERT",
  merchant_locations: "MERCHANT_LOCATIONS_INSERT",
  profiles: "PROFILES_ACCESS",
};

function refinePermissionTarget(message: string): string {
  const match = message.match(/permission denied for (?:table|relation|function|schema|sequence|view) ([\w.]+)/i);
  const object = match?.[1]?.toLowerCase().replace(/^public\./, "").replace(/^auth\./, "");
  if (!object) return "OTHER";
  return PERMISSION_TARGET_BY_OBJECT[object] ?? "FUNCTION_INTERNAL";
}

/**
 * Turns a raw PostgREST/Postgres error into a stable, greppable category so
 * a Vercel log line says what's actually wrong instead of requiring someone
 * to look up an error code. PGRST20x are PostgREST-level ("couldn't even
 * find/call the function" — usually a stale schema cache or a signature
 * mismatch); everything else is a real Postgres SQLSTATE from inside the
 * function body. Any PERMISSION_DENIED is refined into PERMISSION_<TARGET>
 * via refinePermissionTarget above, so "denied on what" survives all the
 * way to the safe category string without ever carrying the raw message.
 */
function categorizeSupabaseError(error: { code?: string; message: string }): string {
  const code = error.code ?? "";
  const message = error.message.toLowerCase();
  // Our own explicit `raise exception 'authentication required'` inside
  // create_merchant_with_owner (0007) has no dedicated SQLSTATE — Postgres
  // defaults unqualified RAISE EXCEPTION to P0001, which is too generic a
  // code to key off safely, so this matches on our own known message text
  // first, before any code-based checks below.
  if (message.includes("authentication required")) return "AUTH_SESSION_MISSING";
  if (code === "PGRST202") return "RPC_NOT_FOUND_SCHEMA_CACHE";
  if (code === "PGRST203") return "RPC_AMBIGUOUS_OVERLOAD";
  if (code.startsWith("PGRST")) return "RPC_UNAVAILABLE_OTHER";
  if (code === "42883") return "RPC_UNDEFINED_FUNCTION";
  if (code === "42501" || message.includes("permission denied")) return `PERMISSION_${refinePermissionTarget(message)}`;
  if (message.includes("row-level security")) return "RLS_DENIED";
  if (code === "23503") return "FOREIGN_KEY_VIOLATION";
  if (code === "23505") return "UNIQUE_VIOLATION";
  if (code === "23502") return "NOT_NULL_VIOLATION";
  if (code === "22P02") return "INVALID_INPUT";
  if (code.startsWith("28")) return "AUTH_SESSION_MISSING";
  if (code.startsWith("08")) return "DB_CONNECTION_ERROR";
  if (code.startsWith("42")) return "SQL_SYNTAX_OR_SCHEMA_MISMATCH";
  if (!code) return "NETWORK_OR_CLIENT_ERROR";
  return "UNKNOWN_DB_ERROR";
}

/**
 * Which leg of createStoreAction → createStore → create_merchant_with_owner
 * → merchants/merchant_members/merchant_locations the failure happened on —
 * see createStore()'s call sites for exactly what each stage covers.
 */
export type CreateStoreStage = "PRE_RPC" | "RPC_EXECUTE" | "RPC_INTERNAL" | "POST_RPC" | "UNEXPECTED";

/**
 * Thrown by createStore() instead of the raw Supabase/Postgres error so a
 * safe, sanitized `category` + `stage` (never a message, code, table/column
 * name, or any other DB internals) can ride along all the way to the Server
 * Action and, from there, the UI. This is a TEMPORARY diagnostic measure:
 * Vercel Logs isn't retaining/showing anything for these requests in the
 * current plan, so console.error alone isn't reaching anyone — surfacing
 * category+stage in the friendly error text itself is the only channel
 * left to identify the real failure without guessing again. Remove once
 * the actual cause is confirmed fixed.
 */
export class MerchantWriteError extends Error {
  category: string;
  stage: CreateStoreStage;
  constructor(category: string, message: string, stage: CreateStoreStage) {
    super(message);
    this.name = "MerchantWriteError";
    this.category = category;
    this.stage = stage;
  }
}

/**
 * Creates the merchant row, its primary location, and the owner membership
 * — as the CURRENT session's user (auth.uid(), read server-side inside the
 * RPC below; the userId parameter here is unused for authorization, it's
 * only threaded through for the caller's own bookkeeping/logging).
 * Auto-publishes (status='active', moderation_status='approved'): Phase 8's
 * documented V1 moderation stance — see 0004_merchant_media.sql's header
 * comment — there is no review queue in this phase.
 *
 * Goes through the create_merchant_with_owner RPC (0005_merchant_bootstrap.sql,
 * made SECURITY DEFINER in 0007_merchant_bootstrap_permissions.sql) rather
 * than three separate inserts: bundling merchants + merchant_members + the
 * optional merchant_locations row into one function call makes them one
 * Postgres transaction, so a failure partway through can never leave an
 * orphaned, unowned merchant row behind.
 *
 * Every exit from this function that isn't a successful Merchant is a
 * thrown MerchantWriteError carrying a sanitized category — including a
 * catch-all around the whole body, so an unexpected thrown value (a raw
 * network/client error that never reaches the `{ data, error }` shape,
 * for example) still comes out categorized instead of silently escaping
 * as a bare, uncategorized Error.
 */
export async function createStore(userId: string, input: CreateStoreInput): Promise<Merchant> {
  try {
    const supabase = await createSupabaseServerClient();
    const slug = await generateUniqueMerchantSlug(supabase, input.name);

    const { data: merchantId, error: rpcError } = await supabase.rpc("create_merchant_with_owner", {
      p_slug: slug,
      p_name: input.name,
      p_logo: input.logo ?? null,
      p_website: input.website || null,
      p_whatsapp: input.whatsapp || null,
      p_instagram: input.instagram || null,
      p_region: input.region || null,
      p_city: input.city || null,
      p_address_optional: input.addressOptional || null,
    });
    if (rpcError) {
      const category = categorizeSupabaseError(rpcError);
      // A category of PERMISSION_RPC_EXECUTE means the EXECUTE privilege
      // check itself failed — the function body never ran at all. Any
      // other category returned from this same call means EXECUTE
      // succeeded and something INSIDE the (now SECURITY DEFINER) function
      // body failed instead — those are two different fixes, so they need
      // two different stages even though supabase-js reports both the
      // same way (an error on the .rpc() call).
      const stage: CreateStoreStage = category === "PERMISSION_RPC_EXECUTE" ? "RPC_EXECUTE" : "RPC_INTERNAL";
      console.error("[createStore] create_merchant_with_owner failed", {
        userId,
        category,
        stage,
        ...describeSupabaseError(rpcError),
      });
      throw new MerchantWriteError(category, rpcError.message, stage);
    }

    if (!merchantId) {
      console.error("[createStore] RPC returned no merchant id", { userId });
      throw new MerchantWriteError("UNKNOWN_DB_ERROR", "create_merchant_with_owner returned no id", "RPC_INTERNAL");
    }

    const { data: merchant, error: merchantError } = await supabase
      .from("merchants")
      .select("*")
      .eq("id", merchantId)
      .single();
    if (merchantError) {
      const category = categorizeSupabaseError(merchantError);
      console.error("[createStore] post-create merchant read-back failed", {
        userId,
        merchantId,
        category,
        ...describeSupabaseError(merchantError),
      });
      throw new MerchantWriteError(category, merchantError.message, "POST_RPC");
    }

    const { data: location, error: locationError } = await supabase
      .from("merchant_locations")
      .select("*")
      .eq("merchant_id", merchantId)
      .eq("is_primary", true)
      .maybeSingle();
    if (locationError) {
      // Non-fatal: the merchant + membership already exist and are the
      // part that actually matters for "store creation succeeded" — a
      // missing location can be added later from /merchant/settings.
      // Logged (categorized) rather than thrown so this alone can't turn
      // an otherwise-successful store creation into a failure.
      console.error("[createStore] primary location read-back failed, continuing without it", {
        userId,
        merchantId,
        category: categorizeSupabaseError(locationError),
        ...describeSupabaseError(locationError),
      });
    }

    return toMerchant(merchant, location ?? undefined);
  } catch (err) {
    if (err instanceof MerchantWriteError) throw err;
    // Anything that reaches here didn't come through the normal
    // { data, error } shape above — e.g. a thrown network/fetch failure,
    // a timeout, or something else entirely unanticipated. Categorize
    // best-effort from whatever shape it has, rather than letting an
    // uncategorized error reach the Server Action.
    const shape = err as { code?: string; message?: string } | undefined;
    const category = shape?.message ? categorizeSupabaseError({ code: shape.code, message: shape.message }) : "UNKNOWN_DB_ERROR";
    console.error("[createStore] unexpected non-Postgrest error", {
      userId,
      category,
      errorType: err?.constructor?.name,
      message: shape?.message,
    });
    throw new MerchantWriteError(category, shape?.message ?? "unknown error", "UNEXPECTED");
  }
}

/** The first store this user is a member of, or null if they aren't a seller yet. Phase 8 V1 assumes one store per seller in the UI (the data model supports more). */
export async function getOwnedMerchant(userId: string): Promise<Merchant | null> {
  const supabase = await createSupabaseServerClient();
  const { data: membership, error: membershipError } = await supabase
    .from("merchant_members")
    .select("merchant_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (!membership) return null;

  const { data: merchant, error: merchantError } = await supabase
    .from("merchants")
    .select("*")
    .eq("id", membership.merchant_id)
    .maybeSingle();
  if (merchantError) throw merchantError;
  if (!merchant) return null;

  const { data: location } = await supabase
    .from("merchant_locations")
    .select("*")
    .eq("merchant_id", merchant.id)
    .eq("is_primary", true)
    .maybeSingle();

  return toMerchant(merchant, location ?? undefined);
}

export interface UpdateStoreInput {
  name?: string;
  region?: string;
  city?: string;
  addressOptional?: string;
  whatsapp?: string;
  instagram?: string;
  website?: string;
  logo?: string;
}

export async function updateStore(merchantId: string, input: UpdateStoreInput): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const patch: Database["public"]["Tables"]["merchants"]["Update"] = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.whatsapp !== undefined) patch.whatsapp = input.whatsapp || null;
  if (input.instagram !== undefined) patch.instagram = input.instagram || null;
  if (input.website !== undefined) patch.website = input.website || null;
  if (input.logo !== undefined) patch.logo = input.logo || null;
  if (Object.keys(patch).length > 0) {
    const { error } = await supabase.from("merchants").update(patch).eq("id", merchantId);
    if (error) throw error;
  }

  if (input.region !== undefined || input.city !== undefined || input.addressOptional !== undefined) {
    const { data: existing } = await supabase
      .from("merchant_locations")
      .select("id")
      .eq("merchant_id", merchantId)
      .eq("is_primary", true)
      .maybeSingle();
    const locationPatch = {
      region: input.region || null,
      city: input.city || null,
      address_optional: input.addressOptional || null,
    };
    if (existing) {
      const { error } = await supabase.from("merchant_locations").update(locationPatch).eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("merchant_locations")
        .insert({ merchant_id: merchantId, is_primary: true, ...locationPatch });
      if (error) throw error;
    }
  }
}

// ---------------------------------------------------------------------------
// Products (owner-scoped — includes drafts, relies on RLS for ownership)
// ---------------------------------------------------------------------------

async function hydrateOwnedProducts(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  rows: ProductRow[],
): Promise<OwnedProduct[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [{ data: images }, { data: interestRows }, { data: aestheticRows }] = await Promise.all([
    supabase.from("product_images").select("*").in("product_id", ids),
    supabase.from("product_interests").select("product_id, interest").in("product_id", ids),
    supabase.from("product_aesthetics").select("product_id, aesthetic").in("product_id", ids),
  ]);
  const imagesByProduct = new Map<string, ImageRow[]>();
  for (const row of images ?? []) {
    const list = imagesByProduct.get(row.product_id) ?? [];
    list.push(row);
    imagesByProduct.set(row.product_id, list);
  }
  const interestsByProduct = new Map<string, Interest[]>();
  for (const row of interestRows ?? []) {
    const list = interestsByProduct.get(row.product_id) ?? [];
    list.push(row.interest as Interest);
    interestsByProduct.set(row.product_id, list);
  }
  const aestheticsByProduct = new Map<string, Aesthetic[]>();
  for (const row of aestheticRows ?? []) {
    const list = aestheticsByProduct.get(row.product_id) ?? [];
    list.push(row.aesthetic as Aesthetic);
    aestheticsByProduct.set(row.product_id, list);
  }
  return rows.map((r) =>
    toProduct(
      r,
      imagesByProduct.get(r.id) ?? [],
      interestsByProduct.get(r.id) ?? [],
      aestheticsByProduct.get(r.id) ?? [],
    ),
  );
}

/** Every product owned by this merchant, newest first — drafts and archived included (RLS's member branch, not the public branch). */
export async function getMerchantProducts(merchantId: string): Promise<OwnedProduct[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return hydrateOwnedProducts(supabase, data ?? []);
}

export async function getOwnedProductById(productId: string): Promise<OwnedProduct | undefined> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("products").select("*").eq("id", productId).maybeSingle();
  if (error) throw error;
  if (!data) return undefined;
  const [product] = await hydrateOwnedProducts(supabase, [data]);
  return product;
}

export interface ProductInput {
  name: string;
  description?: string;
  category: Category;
  price: number;
  originalPrice?: number;
  availability: MerchantAvailability;
  deliveryEstimate?: string;
  externalPurchaseUrl?: string;
  whatsappUrl?: string;
  instagramUrl?: string;
}

export async function createProduct(
  merchantId: string,
  input: ProductInput,
  isDraft: boolean,
): Promise<OwnedProduct> {
  const supabase = await createSupabaseServerClient();
  const slug = await generateUniqueProductSlug(supabase, merchantId, input.name);

  const { data, error } = await supabase
    .from("products")
    .insert({
      merchant_id: merchantId,
      slug,
      name: input.name,
      description: input.description ?? "",
      short_description: (input.description ?? "").slice(0, 160),
      category: input.category,
      price: input.price,
      original_price: input.originalPrice ?? null,
      availability: input.availability,
      delivery_estimate: input.deliveryEstimate || null,
      external_purchase_url: input.externalPurchaseUrl || null,
      whatsapp_url: input.whatsappUrl || null,
      instagram_url: input.instagramUrl || null,
      moderation_status: "approved",
      status: "active",
      is_draft: isDraft,
    })
    .select("*")
    .single();
  if (error) throw error;
  const [product] = await hydrateOwnedProducts(supabase, [data]);
  return product;
}

export async function updateProduct(
  productId: string,
  input: Partial<ProductInput> & { isDraft?: boolean },
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const patch: Database["public"]["Tables"]["products"]["Update"] = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) {
    patch.description = input.description;
    patch.short_description = input.description.slice(0, 160);
  }
  if (input.category !== undefined) patch.category = input.category;
  if (input.price !== undefined) patch.price = input.price;
  if (input.originalPrice !== undefined) patch.original_price = input.originalPrice ?? null;
  if (input.availability !== undefined) patch.availability = input.availability;
  if (input.deliveryEstimate !== undefined) patch.delivery_estimate = input.deliveryEstimate || null;
  if (input.externalPurchaseUrl !== undefined) patch.external_purchase_url = input.externalPurchaseUrl || null;
  if (input.whatsappUrl !== undefined) patch.whatsapp_url = input.whatsappUrl || null;
  if (input.instagramUrl !== undefined) patch.instagram_url = input.instagramUrl || null;
  if (input.isDraft !== undefined) patch.is_draft = input.isDraft;
  if (Object.keys(patch).length === 0) return;
  const { error } = await supabase.from("products").update(patch).eq("id", productId);
  if (error) throw error;
}

export async function setProductAvailability(productId: string, availability: MerchantAvailability): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("products").update({ availability }).eq("id", productId);
  if (error) throw error;
}

export async function archiveProduct(productId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("products").update({ status: "archived" }).eq("id", productId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Product images
// ---------------------------------------------------------------------------

export async function addProductImage(productId: string, url: string, position: number): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("product_images").insert({ product_id: productId, url, position });
  if (error) throw error;
}

export async function deleteProductImage(imageId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("product_images").delete().eq("id", imageId);
  if (error) throw error;
}

export async function getProductImages(productId: string): Promise<{ id: string; url: string; position: number }[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("product_images")
    .select("id, url, position")
    .eq("product_id", productId)
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
