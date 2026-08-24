import "server-only";
import * as supabaseRepo from "@/lib/marketplace/supabase/repository";
import * as mockQueries from "@/lib/marketplace/queries";
import { interactions as seedInteractions } from "@/lib/marketplace/mock/interactions";
import type { Category, Drop, Merchant, Product, ProductInteraction } from "@/lib/marketplace/types";

/**
 * Catalog facade — the storefront's real data source as of Phase 7's
 * catalog cutover. Every page/server-module below imports FROM HERE, never
 * directly from supabase/repository.ts or queries.ts, so there is exactly
 * one place that decides "real catalog vs mock catalog."
 *
 * Each function tries the real Supabase-seeded catalog first and only
 * falls back to the mock catalog (queries.ts / mock/*) if the Supabase
 * call itself throws — a missing/misconfigured project locally, or a
 * transient outage — same fail-closed/fail-gracefully rule already used by
 * getCurrentUser()/AuthProvider/middleware. The mock catalog is kept for
 * exactly that (dev fallback, isolated tests, deterministic fixtures); it
 * is not a second production data source, so callers should not expect a
 * fallback response to be internally consistent with a prior real one
 * (e.g. a drop that resolved for real but whose products momentarily fall
 * back would look empty, not wrong) — acceptable because in practice
 * Supabase is either reachable or it isn't, not reachable-per-table.
 */

async function withMockFallback<T>(load: () => Promise<T>, fallback: () => T): Promise<T> {
  try {
    return await load();
  } catch {
    return fallback();
  }
}

// ---------------------------------------------------------------------------
// Merchants
// ---------------------------------------------------------------------------

export function getAllMerchants(): Promise<Merchant[]> {
  return withMockFallback(
    () => supabaseRepo.getAllMerchants(),
    () => mockQueries.getAllMerchants(),
  );
}

export function getMerchantById(id: string): Promise<Merchant | undefined> {
  return withMockFallback(
    () => supabaseRepo.getMerchantById(id),
    () => mockQueries.getMerchantById(id),
  );
}

export function getMerchantBySlug(slug: string): Promise<Merchant | undefined> {
  return withMockFallback(
    () => supabaseRepo.getMerchantBySlug(slug),
    () => mockQueries.getMerchantBySlug(slug),
  );
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export function getAllProducts(): Promise<Product[]> {
  return withMockFallback(
    () => supabaseRepo.getAllProducts(),
    () => mockQueries.getAllProducts(),
  );
}

export function getProductById(id: string): Promise<Product | undefined> {
  return withMockFallback(
    () => supabaseRepo.getProductById(id),
    () => mockQueries.getProductById(id),
  );
}

export function getProductBySlug(slug: string): Promise<Product | undefined> {
  return withMockFallback(
    () => supabaseRepo.getProductBySlug(slug),
    () => mockQueries.getProductBySlug(slug),
  );
}

export function getProductsByMerchant(merchantId: string): Promise<Product[]> {
  return withMockFallback(
    () => supabaseRepo.getProductsByMerchant(merchantId),
    () => mockQueries.getProductsByMerchant(merchantId),
  );
}

export function getByCategory(category: Category, limit?: number): Promise<Product[]> {
  return withMockFallback(
    () => supabaseRepo.getByCategory(category, limit),
    () => mockQueries.getByCategory(category, limit),
  );
}

export function getRelated(product: Product, limit?: number): Promise<Product[]> {
  return withMockFallback(
    () => supabaseRepo.getRelated(product, limit),
    () => mockQueries.getRelated(product, limit),
  );
}

export function searchProducts(query: string): Promise<Product[]> {
  return withMockFallback(
    () => supabaseRepo.searchProducts(query),
    () => mockQueries.searchProducts(query),
  );
}

export function getNewArrivals(limit?: number): Promise<Product[]> {
  return withMockFallback(
    () => supabaseRepo.getNewArrivals(limit),
    () => mockQueries.getNewArrivals(limit),
  );
}

export function getTrending(limit?: number): Promise<Product[]> {
  return withMockFallback(
    () => supabaseRepo.getTrending(limit),
    () => mockQueries.getTrending(limit),
  );
}

export function getMostLuvid(limit?: number): Promise<Product[]> {
  return withMockFallback(
    () => supabaseRepo.getMostLuvid(limit),
    () => mockQueries.getMostLuvid(limit),
  );
}

/** Used by personalized-home.ts to compute trending scores for recommendations. */
export function getRecentInteractions(days?: number): Promise<ProductInteraction[]> {
  return withMockFallback(
    () => supabaseRepo.getRecentInteractions(days),
    () => seedInteractions,
  );
}

// ---------------------------------------------------------------------------
// Drops
// ---------------------------------------------------------------------------

export function getAllDrops(): Promise<Drop[]> {
  return withMockFallback(
    () => supabaseRepo.getAllDrops(),
    () => mockQueries.getAllDrops(),
  );
}

export function getDropBySlug(slug: string): Promise<Drop | undefined> {
  return withMockFallback(
    () => supabaseRepo.getDropBySlug(slug),
    () => mockQueries.getDropBySlug(slug),
  );
}

export function getProductsForDrop(drop: Drop): Promise<Product[]> {
  return withMockFallback(
    () => supabaseRepo.getProductsForDrop(drop),
    () => mockQueries.getProductsForDrop(drop),
  );
}
