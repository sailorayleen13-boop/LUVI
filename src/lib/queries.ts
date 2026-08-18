import { products as internalProducts } from "@/lib/mock/products";
import { drops as internalDrops } from "@/lib/mock/drops";
import type { Category, Drop, InternalProduct, Product } from "@/lib/types";

/**
 * Mock-backed data access layer. Every function here reads the in-memory
 * arrays today; when Supabase is wired up, swap the bodies for real queries
 * and keep these signatures so callers don't change.
 *
 * `toPublicProduct` is the boundary between internal procurement/inventory
 * data and what the storefront is allowed to render — supplier_* fields
 * never cross it, and raw stock/reservation counts are only surfaced as the
 * derived, customer-safe numbers (lowStockRemaining, availableToReserve).
 */
function toPublicProduct(p: InternalProduct): Product {
  const lowStockRemaining =
    p.availability === "IN_STOCK" && p.localStockQuantity > 0 && p.localStockQuantity <= 3
      ? p.localStockQuantity
      : undefined;

  const availableToReserve =
    p.availability === "PREORDER" || p.availability === "SOLD_OUT_PREORDER"
      ? Math.max(p.incomingQuantity - p.reservedQuantity, 0)
      : undefined;

  // Explicit allowlist (not a destructure-and-omit) so a new internal field
  // added to InternalProduct later can't leak here by default.
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    images: p.images,
    badges: p.badges,
    description: p.description,
    shortDescription: p.shortDescription,
    luviCount: p.luviCount,
    createdAt: p.createdAt,
    availability: p.availability,
    deliveryEstimate: p.deliveryEstimate,
    restockBatchLabel: p.restockBatchLabel,
    dropId: p.dropId,
    lowStockRemaining,
    availableToReserve,
  };
}

const products: Product[] = internalProducts.map(toPublicProduct);

export function getAllProducts(): Product[] {
  return products;
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function getTrending(limit = 8): Product[] {
  return products.filter((p) => p.badges.includes("trending")).slice(0, limit);
}

export function getJustDropped(limit = 8): Product[] {
  return products
    .filter((p) => p.badges.includes("just-dropped"))
    .slice(0, limit);
}

export function getMostLuvid(limit = 8): Product[] {
  return [...products].sort((a, b) => b.luviCount - a.luviCount).slice(0, limit);
}

export function getByCategory(category: Category, limit?: number): Product[] {
  const list = products.filter((p) => p.category === category);
  return typeof limit === "number" ? list.slice(0, limit) : list;
}

export function getNewArrivals(limit = 8): Product[] {
  return [...products]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
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

export function getDropById(id: string): Drop | undefined {
  return internalDrops.find((d) => d.id === id);
}
