import { getAllMerchants, getAllProducts } from "@/lib/marketplace/queries";
import type { Merchant, Product } from "@/lib/marketplace/types";
import { t } from "@/lib/i18n";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export interface SearchResults {
  query: string;
  products: Product[];
  merchants: Merchant[];
}

/**
 * Mock-mode text search: normalized (accent-insensitive) substring matching
 * across product name/description/category and merchant name/city/region.
 * Deliberately simple per Phase 4 scope — no embeddings, no external search
 * service. Callers only see search(query) -> SearchResults, so swapping
 * this for a real search backend later means replacing this function's
 * body, not the pages that call it.
 */
export function search(rawQuery: string): SearchResults {
  const query = normalize(rawQuery);
  if (!query) return { query: rawQuery, products: [], merchants: [] };

  const merchants = getAllMerchants();
  const merchantById = new Map(merchants.map((m) => [m.id, m]));

  const matchedMerchants = merchants.filter((m) =>
    [m.name, m.location.city, m.location.region].some(
      (field) => field && normalize(field).includes(query),
    ),
  );

  const products = getAllProducts().filter((p) => {
    const merchant = merchantById.get(p.merchantId);
    const haystack = [
      p.name,
      p.description,
      p.shortDescription,
      t.category[p.category],
      merchant?.name,
      merchant?.location.city,
      merchant?.location.region,
    ];
    return haystack.some((field) => field && normalize(field).includes(query));
  });

  return { query: rawQuery, products, merchants: matchedMerchants };
}
