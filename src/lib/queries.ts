import { products } from "@/lib/mock/products";
import type { Category, Product } from "@/lib/types";

/**
 * Mock-backed data access layer. Every function here reads the in-memory
 * `products` array today; when Supabase is wired up, swap the bodies for
 * real queries and keep these signatures so callers don't change.
 */

export function getAllProducts(): Product[] {
  return products;
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
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
