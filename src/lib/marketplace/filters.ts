import type { Category, Merchant, MerchantAvailability, Product } from "@/lib/marketplace/types";

export interface ProductFilters {
  category?: Category;
  availability?: MerchantAvailability;
  region?: string;
  merchantId?: string;
}

/**
 * Pure client-side filter over an already-loaded product list. Explore
 * calls this directly against mock data today; moving filtering
 * server-side later means replacing this function's body with an API call
 * that takes the same ProductFilters shape — the page's state/UI doesn't
 * need to change.
 */
export function filterProducts(
  products: Product[],
  merchants: Record<string, Merchant>,
  filters: ProductFilters,
): Product[] {
  return products.filter((product) => {
    if (filters.category && product.category !== filters.category) return false;
    if (filters.availability && product.availability !== filters.availability) return false;
    if (filters.merchantId && product.merchantId !== filters.merchantId) return false;
    if (filters.region) {
      const merchant = merchants[product.merchantId];
      if (!merchant || merchant.location.region !== filters.region) return false;
    }
    return true;
  });
}

export function hasActiveFilter(filters: ProductFilters): boolean {
  return Boolean(filters.category || filters.availability || filters.region || filters.merchantId);
}
