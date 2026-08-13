import { merchants as internalMerchants } from "@/lib/marketplace/mock/merchants";
import { products as internalProducts } from "@/lib/marketplace/mock/products";
import { drops as allDrops } from "@/lib/marketplace/mock/drops";
import type {
  Category,
  Drop,
  InternalMerchant,
  InternalProduct,
  Merchant,
  Product,
} from "@/lib/marketplace/types";

/**
 * Mock-backed data access layer. Every function reads the in-memory arrays
 * today; swapping to Supabase later means changing these bodies, not the
 * signatures or anything that calls them.
 *
 * toPublicMerchant/toPublicProduct are the boundary between internal
 * records and what the storefront may render — both use an explicit
 * allowlist (not a destructure-and-omit) so a new internal field added
 * later can't leak into the public shape by default.
 */

function toPublicMerchant(m: InternalMerchant): Merchant {
  return {
    id: m.id,
    slug: m.slug,
    name: m.name,
    logo: m.logo,
    description: m.description,
    location: m.location,
    website: m.website,
    whatsapp: m.whatsapp,
    instagram: m.instagram,
    status: m.status,
    createdAt: m.createdAt,
  };
}

function toPublicProduct(p: InternalProduct): Product {
  return {
    id: p.id,
    merchantId: p.merchantId,
    slug: p.slug,
    name: p.name,
    description: p.description,
    shortDescription: p.shortDescription,
    category: p.category,
    price: p.price,
    currency: p.currency,
    images: p.images,
    badges: p.badges,
    availability: p.availability,
    deliveryEstimate: p.deliveryEstimate,
    externalPurchaseUrl: p.externalPurchaseUrl,
    whatsappUrl: p.whatsappUrl,
    instagramUrl: p.instagramUrl,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

const merchants: Merchant[] = internalMerchants.map(toPublicMerchant);
const products: Product[] = internalProducts.map(toPublicProduct);

// ---------------------------------------------------------------------------
// Merchants
// ---------------------------------------------------------------------------

export function getAllMerchants(): Merchant[] {
  return merchants;
}

export function getMerchantById(id: string): Merchant | undefined {
  return merchants.find((m) => m.id === id);
}

export function getMerchantBySlug(slug: string): Merchant | undefined {
  return merchants.find((m) => m.slug === slug);
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export function getAllProducts(): Product[] {
  return products;
}

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductsByMerchant(merchantId: string): Product[] {
  return products.filter((p) => p.merchantId === merchantId);
}

export function getByCategory(category: Category, limit?: number): Product[] {
  const list = products.filter((p) => p.category === category);
  return typeof limit === "number" ? list.slice(0, limit) : list;
}

export function getRelated(product: Product, limit = 6): Product[] {
  return products
    .filter((p) => p.id !== product.id && p.category === product.category)
    .slice(0, limit);
}

export function searchProducts(query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.shortDescription.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q),
  );
}

/**
 * Mock-mode "Trending Near You": ranks by the internal seedPopularity seed.
 * NOT a real scoring algorithm — once real usage exists this should rank by
 * aggregated ProductInteraction events (views/saves/luvi_it_click,
 * recency-weighted, filtered by location) instead. See InternalProduct.seedPopularity.
 */
export function getTrending(limit = 8): Product[] {
  const bySeed = new Map(internalProducts.map((p) => [p.id, p.seedPopularity]));
  return [...products]
    .sort((a, b) => (bySeed.get(b.id) ?? 0) - (bySeed.get(a.id) ?? 0))
    .slice(0, limit);
}

export function getNewArrivals(limit = 8): Product[] {
  return [...products]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Drops (editorial collections, may span multiple merchants)
// ---------------------------------------------------------------------------

export function getAllDrops(): Drop[] {
  return allDrops;
}

export function getDropBySlug(slug: string): Drop | undefined {
  return allDrops.find((d) => d.slug === slug);
}

export function getProductsForDrop(drop: Drop): Product[] {
  return drop.productIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => p !== undefined);
}
