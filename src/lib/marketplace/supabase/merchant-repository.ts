import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Aesthetic, Category, Interest, Merchant, MerchantAvailability, Product } from "@/lib/marketplace/types";
import type { Database, MerchantProductRpcRow } from "@/lib/supabase/types";

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

/**
 * toMerchant() only ever reads these fields, so it accepts any object
 * shaped like this subset — not just a full MerchantRow/LocationRow. That
 * lets it map BOTH a real table row (getOwnedMerchant, updateStore) AND
 * the flattened row create_merchant_with_owner's RPC returns directly
 * (0009_merchant_bootstrap_return.sql) without fabricating a fake full
 * LocationRow (id/merchant_id/is_primary/created_at) just to satisfy a
 * stricter type.
 */
type MerchantEssentials = Pick<
  MerchantRow,
  "id" | "slug" | "name" | "logo" | "description" | "website" | "whatsapp" | "instagram" | "status" | "created_at"
>;
type LocationEssentials = Pick<LocationRow, "region" | "city" | "address_optional">;

function toMerchant(row: MerchantEssentials, location: LocationEssentials | undefined): Merchant {
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
export type CreateStoreStage = "RPC_EXECUTE" | "RPC_INTERNAL" | "UNEXPECTED";

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
 * made SECURITY DEFINER in 0007_merchant_bootstrap_permissions.sql, slug
 * generation moved server-side in 0008_merchant_slug_bootstrap.sql, return
 * shape added in 0009_merchant_bootstrap_return.sql) rather than three
 * separate inserts: bundling merchants + merchant_members + the optional
 * merchant_locations row into one function call makes them one Postgres
 * transaction, so a failure partway through can never leave an orphaned,
 * unowned merchant row behind. As of 0009, this function makes NO
 * follow-up read against merchants/merchant_locations after the RPC
 * returns — the RPC's own result row already carries every field
 * toMerchant() needs, so there is nothing left for the calling
 * `authenticated` role to touch under INVOKER privileges at all: the
 * entire bootstrap, reads included, happens inside the one SECURITY
 * DEFINER call.
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

    const { data: rows, error: rpcError } = await supabase.rpc("create_merchant_with_owner", {
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

    const row = rows?.[0];
    if (!row) {
      console.error("[createStore] RPC returned no row", { userId });
      throw new MerchantWriteError("UNKNOWN_DB_ERROR", "create_merchant_with_owner returned no row", "RPC_INTERNAL");
    }

    return toMerchant(row, { region: row.region, city: row.city, address_optional: row.address_optional });
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

/**
 * The first store this user is a member of, or null if they aren't a
 * seller yet. Phase 8 V1 assumes one store per seller in the UI (the data
 * model supports more).
 *
 * Goes through the get_owned_merchant RPC (0010_owned_merchant_read.sql)
 * rather than a plain SELECT: the calling `authenticated` role has been
 * confirmed (twice — the PRE_RPC and POST_RPC diagnostics fixed in
 * 0008/0009) to lack the underlying table-level grant on `merchants` this
 * codebase originally assumed existed, and the same likely applies to
 * every other owner-scoped table this file touches. The RPC derives the
 * user from auth.uid() itself — the userId parameter here is unused for
 * authorization, kept only so call sites read clearly.
 */
export async function getOwnedMerchant(userId: string): Promise<Merchant | null> {
  void userId;
  const supabase = await createSupabaseServerClient();
  const { data: rows, error } = await supabase.rpc("get_owned_merchant");
  if (error) {
    console.error("[getOwnedMerchant] rpc failed", { category: categorizeSupabaseError(error), ...describeSupabaseError(error) });
    throw error;
  }
  const row = rows?.[0];
  if (!row) return null;
  return toMerchant(row, { region: row.region, city: row.city, address_optional: row.address_optional });
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

/** Same PERMISSION_MERCHANTS_* gap as getOwnedMerchant() — goes through update_owned_merchant (0010), which derives the target store from auth.uid() itself; merchantId is kept for call-site clarity but unused for authorization. */
export async function updateStore(merchantId: string, input: UpdateStoreInput): Promise<void> {
  void merchantId;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("update_owned_merchant", {
    p_name: input.name ?? null,
    p_logo: input.logo || null,
    p_website: input.website || null,
    p_whatsapp: input.whatsapp || null,
    p_instagram: input.instagram || null,
    p_region: input.region || null,
    p_city: input.city || null,
    p_address_optional: input.addressOptional || null,
  });
  if (error) {
    console.error("[updateStore] rpc failed", { category: categorizeSupabaseError(error), ...describeSupabaseError(error) });
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Products (owner-scoped — includes drafts/archived) — every read/write
// below goes through a SECURITY DEFINER RPC (0010_owned_merchant_read.sql)
// rather than a plain table call, for the same reason as getOwnedMerchant/
// updateStore above: the calling `authenticated` role has been confirmed
// to lack the underlying table-level grant this codebase assumed existed
// on `merchants`, and there's no reason to assume products/product_images/
// merchant_members/merchant_locations are any different — each RPC
// re-derives the product's owning merchant server-side and checks
// is_merchant_member()/is_admin() before touching anything, so a
// productId/merchantId argument can only ever prove "I can't see this",
// never be used to read or write someone else's data.
// ---------------------------------------------------------------------------

function toOwnedProduct(row: MerchantProductRpcRow): OwnedProduct {
  return {
    id: row.id,
    status: row.status as "active" | "archived",
    merchantId: row.merchant_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    shortDescription: row.short_description,
    category: row.category as Category,
    price: Number(row.price),
    originalPrice: row.original_price === null ? undefined : Number(row.original_price),
    currency: row.currency as "CRC",
    images: row.images ?? [],
    badges: [],
    interests: (row.interests ?? []) as Interest[],
    aesthetics: (row.aesthetics ?? []) as Aesthetic[],
    availability: row.availability as MerchantAvailability,
    isDraft: row.is_draft,
    deliveryEstimate: row.delivery_estimate ?? undefined,
    externalPurchaseUrl: row.external_purchase_url ?? undefined,
    whatsappUrl: row.whatsapp_url ?? undefined,
    instagramUrl: row.instagram_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Every product owned by this merchant, newest first — drafts and archived included (the RPC checks membership on merchantId itself). */
export async function getMerchantProducts(merchantId: string): Promise<OwnedProduct[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_merchant_products", { p_merchant_id: merchantId });
  if (error) {
    console.error("[getMerchantProducts] rpc failed", { category: categorizeSupabaseError(error), ...describeSupabaseError(error) });
    throw error;
  }
  return (data ?? []).map(toOwnedProduct);
}

export async function getOwnedProductById(productId: string): Promise<OwnedProduct | undefined> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_owned_product", { p_product_id: productId });
  if (error) {
    console.error("[getOwnedProductById] rpc failed", { category: categorizeSupabaseError(error), ...describeSupabaseError(error) });
    throw error;
  }
  const row = data?.[0];
  return row ? toOwnedProduct(row) : undefined;
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

/** Returns just the new product's id — every caller in actions.ts only ever needed that (to build a redirect URL), so this skips a wasted follow-up hydration read. Call getOwnedProductById(id) if the full OwnedProduct is genuinely needed. */
export async function createProduct(merchantId: string, input: ProductInput, isDraft: boolean): Promise<{ id: string }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_merchant_product", {
    p_merchant_id: merchantId,
    p_name: input.name,
    p_description: input.description ?? null,
    p_category: input.category,
    p_price: input.price,
    p_original_price: input.originalPrice ?? null,
    p_availability: input.availability,
    p_delivery_estimate: input.deliveryEstimate || null,
    p_external_purchase_url: input.externalPurchaseUrl || null,
    p_whatsapp_url: input.whatsappUrl || null,
    p_instagram_url: input.instagramUrl || null,
    p_is_draft: isDraft,
  });
  if (error) {
    console.error("[createProduct] rpc failed", { category: categorizeSupabaseError(error), ...describeSupabaseError(error) });
    throw error;
  }
  return { id: data as unknown as string };
}

export async function updateProduct(
  productId: string,
  input: Partial<ProductInput> & { isDraft?: boolean },
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("update_merchant_product", {
    p_product_id: productId,
    p_name: input.name ?? null,
    p_description: input.description ?? null,
    p_category: input.category ?? null,
    p_price: input.price ?? null,
    p_original_price: input.originalPrice ?? null,
    p_availability: input.availability ?? null,
    p_delivery_estimate: input.deliveryEstimate ?? null,
    p_external_purchase_url: input.externalPurchaseUrl ?? null,
    p_whatsapp_url: input.whatsappUrl ?? null,
    p_instagram_url: input.instagramUrl ?? null,
    p_is_draft: input.isDraft ?? null,
  });
  if (error) {
    console.error("[updateProduct] rpc failed", { category: categorizeSupabaseError(error), ...describeSupabaseError(error) });
    throw error;
  }
}

export async function setProductAvailability(productId: string, availability: MerchantAvailability): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("set_product_availability", { p_product_id: productId, p_availability: availability });
  if (error) {
    console.error("[setProductAvailability] rpc failed", { category: categorizeSupabaseError(error), ...describeSupabaseError(error) });
    throw error;
  }
}

export async function archiveProduct(productId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("archive_merchant_product", { p_product_id: productId });
  if (error) {
    console.error("[archiveProduct] rpc failed", { category: categorizeSupabaseError(error), ...describeSupabaseError(error) });
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Product images
// ---------------------------------------------------------------------------

export async function addProductImage(productId: string, url: string, position: number): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("add_merchant_product_image", { p_product_id: productId, p_url: url, p_position: position });
  if (error) {
    console.error("[addProductImage] rpc failed", { category: categorizeSupabaseError(error), ...describeSupabaseError(error) });
    throw error;
  }
}

export async function deleteProductImage(imageId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("delete_merchant_product_image", { p_image_id: imageId });
  if (error) {
    console.error("[deleteProductImage] rpc failed", { category: categorizeSupabaseError(error), ...describeSupabaseError(error) });
    throw error;
  }
}

export async function getProductImages(productId: string): Promise<{ id: string; url: string; position: number }[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_merchant_product_images", { p_product_id: productId });
  if (error) {
    console.error("[getProductImages] rpc failed", { category: categorizeSupabaseError(error), ...describeSupabaseError(error) });
    throw error;
  }
  return data ?? [];
}
