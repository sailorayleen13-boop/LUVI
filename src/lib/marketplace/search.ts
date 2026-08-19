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
 * Text search: normalized (accent-insensitive) substring matching across
 * product name/description/category and merchant name/city/region.
 * Deliberately simple per Phase 4 scope — no embeddings, no external search
 * service. Takes the catalog to search as plain arguments (rather than
 * reading a module-level catalog itself) so it stays a pure function
 * regardless of whether the caller sourced products/merchants from
 * Supabase (catalog.ts, the real production path since Phase 7's cutover)
 * or from the mock catalog directly (tests, isolated fixtures).
 */
export function search(rawQuery: string, products: Product[], merchants: Merchant[]): SearchResults {
  const query = normalize(rawQuery);
  if (!query) return { query: rawQuery, products: [], merchants: [] };

  const merchantById = new Map(merchants.map((m) => [m.id, m]));

  const matchedMerchants = merchants.filter((m) =>
    [m.name, m.location.city, m.location.region].some(
      (field) => field && normalize(field).includes(query),
    ),
  );

  const matchedProducts = products.filter((p) => {
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

  return { query: rawQuery, products: matchedProducts, merchants: matchedMerchants };
}
