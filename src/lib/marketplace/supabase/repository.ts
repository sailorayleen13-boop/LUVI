import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { computeTrendingScores } from "@/lib/marketplace/trending";
import type { Category, Drop, Merchant, Product, ProductInteraction } from "@/lib/marketplace/types";
import type { Database } from "@/lib/supabase/types";

/**
 * Supabase-backed implementation of the same conceptual API as
 * src/lib/marketplace/queries.ts (getAllMerchants, getProductBySlug,
 * getTrending, etc.) — written to validate the Phase 6 infrastructure
 * (schema + RLS + client separation) end to end, NOT wired into any page
 * yet. queries.ts stays mock-backed and is what the UI actually calls today
 * (see Phase 6 Step 6 / the completion report for why).
 *
 * Every function here does its own explicit column allowlisting on top of
 * RLS — same "allowlist, not destructure-and-omit" rule queries.ts's
 * toPublicMerchant()/toPublicProduct() already follow — so a new internal
 * column added to a table later can't silently leak through a `select("*")`.
 */

type LocationRow = Database["public"]["Tables"]["merchant_locations"]["Row"];
type ImageRow = Database["public"]["Tables"]["product_images"]["Row"];
type DropRow = Database["public"]["Tables"]["drops"]["Row"];

const MERCHANT_COLUMNS = "id, slug, name, logo, description, website, whatsapp, instagram, status, created_at";
const PRODUCT_COLUMNS =
  "id, merchant_id, slug, name, description, short_description, category, price, currency, availability, delivery_estimate, external_purchase_url, whatsapp_url, instagram_url, created_at, updated_at";

// The public allowlist selects fewer columns than the full table Row (no
// moderation_status/contact_email/status) — same "allowlist, not
// destructure-and-omit" boundary as toPublicMerchant()/toPublicProduct() in
// queries.ts, just enforced at the query level instead of after the fact.
// These types describe exactly what MERCHANT_COLUMNS/PRODUCT_COLUMNS return.
type MerchantRow = Pick<
  Database["public"]["Tables"]["merchants"]["Row"],
  "id" | "slug" | "name" | "logo" | "description" | "website" | "whatsapp" | "instagram" | "status" | "created_at"
>;
type ProductRow = Pick<
  Database["public"]["Tables"]["products"]["Row"],
  | "id"
  | "merchant_id"
  | "slug"
  | "name"
  | "description"
  | "short_description"
  | "category"
  | "price"
  | "currency"
  | "availability"
  | "delivery_estimate"
  | "external_purchase_url"
  | "whatsapp_url"
  | "instagram_url"
  | "created_at"
  | "updated_at"
>;

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

function toProduct(row: ProductRow, images: ImageRow[]): Product {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    shortDescription: row.short_description,
    category: row.category as Category,
    price: Number(row.price),
    currency: row.currency,
    images: images
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((i) => i.url),
    // Derived, never stored (Phase 5 Section 1) — a caller that needs
    // "trending"/"new" badges computes them itself (getTrending() +
    // createdAt-based recency), same as queries.ts does today.
    badges: [],
    availability: row.availability,
    deliveryEstimate: row.delivery_estimate ?? undefined,
    externalPurchaseUrl: row.external_purchase_url ?? undefined,
    whatsappUrl: row.whatsapp_url ?? undefined,
    instagramUrl: row.instagram_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function loadPrimaryLocations(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  merchantIds: string[],
): Promise<Map<string, LocationRow>> {
  if (merchantIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("merchant_locations")
    .select("*")
    .in("merchant_id", merchantIds)
    .eq("is_primary", true);
  if (error) throw error;
  return new Map((data ?? []).map((l) => [l.merchant_id, l]));
}

async function loadImages(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  productIds: string[],
): Promise<Map<string, ImageRow[]>> {
  if (productIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("product_images")
    .select("*")
    .in("product_id", productIds);
  if (error) throw error;
  const byProduct = new Map<string, ImageRow[]>();
  for (const row of data ?? []) {
    const list = byProduct.get(row.product_id) ?? [];
    list.push(row);
    byProduct.set(row.product_id, list);
  }
  return byProduct;
}

// ---------------------------------------------------------------------------
// Merchants
// ---------------------------------------------------------------------------

export async function getAllMerchants(): Promise<Merchant[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("merchants")
    .select(MERCHANT_COLUMNS)
    .eq("status", "active")
    .eq("moderation_status", "approved");
  if (error) throw error;
  const rows = data ?? [];
  const locations = await loadPrimaryLocations(supabase, rows.map((r) => r.id));
  return rows.map((r) => toMerchant(r, locations.get(r.id)));
}

export async function getMerchantBySlug(slug: string): Promise<Merchant | undefined> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("merchants")
    .select(MERCHANT_COLUMNS)
    .eq("slug", slug)
    .eq("status", "active")
    .eq("moderation_status", "approved")
    .maybeSingle();
  if (error) throw error;
  if (!data) return undefined;
  const locations = await loadPrimaryLocations(supabase, [data.id]);
  return toMerchant(data, locations.get(data.id));
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

async function hydrateProducts(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  rows: ProductRow[],
): Promise<Product[]> {
  const images = await loadImages(supabase, rows.map((r) => r.id));
  return rows.map((r) => toProduct(r, images.get(r.id) ?? []));
}

export async function getAllProducts(): Promise<Product[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("status", "active")
    .eq("moderation_status", "approved");
  if (error) throw error;
  return hydrateProducts(supabase, data ?? []);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("slug", slug)
    .eq("status", "active")
    .eq("moderation_status", "approved")
    .maybeSingle();
  if (error) throw error;
  if (!data) return undefined;
  const [product] = await hydrateProducts(supabase, [data]);
  return product;
}

export async function getProductsByMerchant(merchantId: string): Promise<Product[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("merchant_id", merchantId)
    .eq("status", "active")
    .eq("moderation_status", "approved");
  if (error) throw error;
  return hydrateProducts(supabase, data ?? []);
}

export async function getByCategory(category: Category, limit?: number): Promise<Product[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("category", category)
    .eq("status", "active")
    .eq("moderation_status", "approved");
  if (typeof limit === "number") query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return hydrateProducts(supabase, data ?? []);
}

/**
 * Stage-1 migration path for search.ts's search() per Phase 5 Section 7:
 * substring matching moves from Array.filter to a Postgres `ilike` query,
 * same result shape, no full-text search yet.
 */
export async function searchProducts(query: string): Promise<Product[]> {
  const q = query.trim();
  if (!q) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("status", "active")
    .eq("moderation_status", "approved")
    .or(`name.ilike.%${q}%,short_description.ilike.%${q}%`);
  if (error) throw error;
  return hydrateProducts(supabase, data ?? []);
}

export async function getNewArrivals(limit = 8): Promise<Product[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("status", "active")
    .eq("moderation_status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return hydrateProducts(supabase, data ?? []);
}

/**
 * Reads recent product_interactions through the ADMIN client, deliberately
 * — RLS has no select policy for anon/authenticated on that table at all
 * (see 0002_rls.sql), so an aggregate read like trending has to happen
 * server-side with the service role, same as any other cross-user
 * analytics read. This is exactly the boundary src/lib/supabase/admin.ts
 * exists to draw: ordinary per-user data goes through the anon/session
 * client; aggregate/cross-tenant reads go through here.
 */
async function loadRecentInteractions(days = 30): Promise<ProductInteraction[]> {
  const admin = createSupabaseAdminClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("product_interactions")
    .select("id, type, product_id, merchant_id, category, query, created_at")
    .gte("created_at", since);
  if (error) throw error;
  return (data ?? [])
    .filter((row) => row.product_id !== null)
    .map((row) => ({
      id: row.id,
      type: row.type,
      productId: row.product_id ?? undefined,
      merchantId: row.merchant_id ?? undefined,
      category: (row.category as Category) ?? undefined,
      query: row.query ?? undefined,
      createdAt: row.created_at,
    }));
}

export async function getTrending(limit = 8): Promise<Product[]> {
  const [products, events] = await Promise.all([getAllProducts(), loadRecentInteractions()]);
  const scores = computeTrendingScores(events);
  return [...products]
    .sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0))
    .slice(0, limit);
}

export async function getMostLuvid(limit = 8): Promise<Product[]> {
  const [products, events] = await Promise.all([getAllProducts(), loadRecentInteractions()]);
  // Same event list as getTrending(), weighted toward "save" only, so mock
  // parity (Trending vs Most LUVI'd reading two different signals) carries
  // over once this is real data instead of the seedPopularity/seedLuviCount
  // mock split.
  const scores = computeTrendingScores(events, Date.now(), {
    product_view: 0,
    save: 1,
    luvi_it_click: 0,
  });
  return [...products]
    .sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0))
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Drops
// ---------------------------------------------------------------------------

function toDrop(row: DropRow, productIds: string[]): Drop {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? undefined,
    coverEmoji: row.cover_emoji ?? "",
    productIds,
    status: row.status === "published" ? "active" : row.status === "draft" ? "scheduled" : "archived",
    publishedAt: row.published_at ?? row.created_at,
  };
}

async function loadDropProductIds(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  dropIds: string[],
): Promise<Map<string, string[]>> {
  if (dropIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("drop_products")
    .select("drop_id, product_id, position")
    .in("drop_id", dropIds)
    .order("position", { ascending: true });
  if (error) throw error;
  const byDrop = new Map<string, string[]>();
  for (const row of data ?? []) {
    const list = byDrop.get(row.drop_id) ?? [];
    list.push(row.product_id);
    byDrop.set(row.drop_id, list);
  }
  return byDrop;
}

export async function getAllDrops(): Promise<Drop[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("drops").select("*").eq("status", "published");
  if (error) throw error;
  const rows = data ?? [];
  const productIds = await loadDropProductIds(supabase, rows.map((r) => r.id));
  return rows.map((r) => toDrop(r, productIds.get(r.id) ?? []));
}

export async function getDropBySlug(slug: string): Promise<Drop | undefined> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("drops")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  if (!data) return undefined;
  const productIds = await loadDropProductIds(supabase, [data.id]);
  return toDrop(data, productIds.get(data.id) ?? []);
}

export async function getProductsForDrop(drop: Drop): Promise<Product[]> {
  if (drop.productIds.length === 0) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .in("id", drop.productIds)
    .eq("status", "active")
    .eq("moderation_status", "approved");
  if (error) throw error;
  const bySlugOrder = new Map(drop.productIds.map((id, i) => [id, i]));
  const hydrated = await hydrateProducts(supabase, data ?? []);
  return hydrated.sort((a, b) => (bySlugOrder.get(a.id) ?? 0) - (bySlugOrder.get(b.id) ?? 0));
}
