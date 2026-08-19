"use client";

import { useEffect, useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { search, type SearchResults } from "@/lib/marketplace/search";
import { trackInteraction } from "@/lib/marketplace/interactions";
import { DEFAULT_DISCOVERY_LOCATION } from "@/lib/marketplace/region-config";
import type { Merchant, Product } from "@/lib/marketplace/types";
import { t } from "@/lib/i18n";
import { SearchHeader } from "@/components/marketplace/search-header";
import { SectionHeader } from "@/components/home/section-header";
import { HorizontalScroller } from "@/components/home/horizontal-scroller";
import { MerchantCard } from "@/components/marketplace/merchant-card";
import { ProductCard } from "@/components/marketplace/product-card";

const EMPTY_RESULTS: SearchResults = { query: "", products: [], merchants: [] };
const TRACK_DEBOUNCE_MS = 600;

interface SearchViewProps {
  merchants: Merchant[];
  products: Product[];
}

/**
 * Takes the catalog (merchants/products) as props rather than fetching it
 * itself — same split as /explore's ExploreView, for the same reason
 * (Supabase reads need cookies(), so they happen server-side in page.tsx
 * and get passed down once). search() itself is a pure function over
 * these arrays (see search.ts), so it stays a fast synchronous call on
 * every keystroke exactly as before the catalog cutover.
 */
export function SearchView({ merchants: allMerchants, products: allProducts }: SearchViewProps) {
  const [query, setQuery] = useState("");
  const merchantsById = Object.fromEntries(allMerchants.map((m) => [m.id, m]));

  const trimmedQuery = query.trim();
  const results: SearchResults = trimmedQuery
    ? search(trimmedQuery, allProducts, allMerchants)
    : EMPTY_RESULTS;

  useEffect(() => {
    if (!trimmedQuery) return;
    const trackTimeout = setTimeout(() => {
      trackInteraction({ type: "search", query: trimmedQuery, location: DEFAULT_DISCOVERY_LOCATION });
    }, TRACK_DEBOUNCE_MS);
    return () => clearTimeout(trackTimeout);
  }, [trimmedQuery]);

  const hasQuery = trimmedQuery.length > 0;
  const hasResults = results.products.length > 0 || results.merchants.length > 0;

  return (
    <>
      <SearchHeader value={query} onChange={setQuery} />

      <main className="flex flex-col gap-6 px-4 pb-8 pt-3">
        {!hasQuery && (
          <p className="px-1 text-[13.5px] text-charcoal-faint">{t.search.supportingCopy}</p>
        )}

        {hasQuery && (
          <p className="px-1 text-[12.5px] text-charcoal-faint">
            {t.search.resultsCount(results.products.length, results.query)}
          </p>
        )}

        {hasQuery && !hasResults && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-fucsia-light">
              <SearchIcon size={22} className="text-fucsia-dark" />
            </div>
            <p className="font-display text-base font-semibold text-charcoal">
              {t.search.emptyTitle(results.query)}
            </p>
            <p className="text-sm text-charcoal-faint">{t.search.emptySubtitle}</p>
          </div>
        )}

        {results.merchants.length > 0 && (
          <section className="flex flex-col gap-3">
            <SectionHeader title={t.search.storesHeading} />
            <HorizontalScroller>
              {results.merchants.map((merchant) => (
                <MerchantCard key={merchant.id} merchant={merchant} />
              ))}
            </HorizontalScroller>
          </section>
        )}

        {results.products.length > 0 && (
          <section className="flex flex-col gap-3">
            <SectionHeader title={t.search.productsHeading} />
            <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3 md:gap-x-4 md:gap-y-6 lg:grid-cols-4 lg:gap-x-5 xl:grid-cols-5">
              {results.products.map((product) => {
                const merchant = merchantsById[product.merchantId];
                if (!merchant) return null;
                return <ProductCard key={product.id} product={product} merchant={merchant} />;
              })}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
