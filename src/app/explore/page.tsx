"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { getAllMerchants, getAllProducts, getByCategory } from "@/lib/marketplace/queries";
import { filterProducts, hasActiveFilter, type ProductFilters } from "@/lib/marketplace/filters";
import type { Category, MerchantAvailability } from "@/lib/marketplace/types";
import { t } from "@/lib/i18n";
import { TabHeader } from "@/components/marketplace/tab-header";
import { FilterChipRow } from "@/components/marketplace/filter-chip-row";
import { DiscoverySection } from "@/components/marketplace/discovery-section";
import { ProductCard } from "@/components/marketplace/product-card";

// Presentation-order only — matches the Category union in lib/marketplace/types.ts.
const CATEGORY_ORDER: Category[] = [
  "squishies",
  "collectibles",
  "pets",
  "beauty",
  "fashion",
  "home",
  "tech",
  "gifts",
  "viral",
];

const AVAILABILITY_ORDER: MerchantAvailability[] = [
  "IN_STOCK",
  "PREORDER",
  "COMING_SOON",
  "SOLD_OUT",
];

/**
 * Category browse by default (discovery-first, unchanged from Phase 3).
 * Picking any filter switches to a flat results grid instead — filtering
 * itself lives in filterProducts() (lib/marketplace/filters.ts), a pure
 * function this page just calls, so moving it server-side later doesn't
 * require rewriting this component.
 */
export default function ExplorePage() {
  const [category, setCategory] = useState<Category | undefined>();
  const [availability, setAvailability] = useState<MerchantAvailability | undefined>();
  const [region, setRegion] = useState<string | undefined>();
  const [merchantId, setMerchantId] = useState<string | undefined>();

  const allMerchants = getAllMerchants();
  const merchantsById = useMemo(
    () => Object.fromEntries(allMerchants.map((m) => [m.id, m])),
    [allMerchants],
  );
  const regions = useMemo(
    () =>
      Array.from(
        new Set(allMerchants.map((m) => m.location.region).filter((r): r is string => Boolean(r))),
      ),
    [allMerchants],
  );

  const filters: ProductFilters = { category, availability, region, merchantId };
  const filtersActive = hasActiveFilter(filters);
  const filteredProducts = useMemo(
    () => (filtersActive ? filterProducts(getAllProducts(), merchantsById, filters) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtersActive, category, availability, region, merchantId, merchantsById],
  );

  return (
    <>
      <TabHeader title={t.explore.heading} subtitle={t.explore.subtitle} />

      <div className="px-4 pb-3">
        <Link
          href="/search"
          className="flex items-center gap-2 rounded-full bg-cream-soft px-4 py-2.5 text-[13.5px] text-charcoal-faint active:bg-charcoal/5"
        >
          <Search size={16} />
          {t.search.placeholder}
        </Link>
      </div>

      <div className="flex flex-col gap-3.5 pb-5">
        <FilterChipRow
          label={t.filters.category}
          value={category}
          onChange={setCategory}
          options={CATEGORY_ORDER.map((c) => ({ value: c, label: t.category[c] }))}
        />
        <FilterChipRow
          label={t.filters.availability}
          value={availability}
          onChange={setAvailability}
          options={AVAILABILITY_ORDER.map((a) => ({ value: a, label: t.availability[a] }))}
        />
        {regions.length > 0 && (
          <FilterChipRow
            label={t.filters.region}
            value={region}
            onChange={setRegion}
            options={regions.map((r) => ({ value: r, label: r }))}
          />
        )}
        <FilterChipRow
          label={t.filters.merchant}
          value={merchantId}
          onChange={setMerchantId}
          options={allMerchants.map((m) => ({ value: m.id, label: m.name }))}
        />
      </div>

      {filtersActive ? (
        <main className="flex flex-col gap-3 px-4 pb-8">
          <p className="text-[12.5px] text-charcoal-faint">
            {t.filters.resultsCount(filteredProducts.length)}
          </p>
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <p className="font-display text-base font-semibold text-charcoal">
                {t.filters.noResultsTitle}
              </p>
              <p className="text-sm text-charcoal-faint">{t.filters.noResultsSubtitle}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-5">
              {filteredProducts.map((product) => {
                const merchant = merchantsById[product.merchantId];
                if (!merchant) return null;
                return <ProductCard key={product.id} product={product} merchant={merchant} />;
              })}
            </div>
          )}
        </main>
      ) : (
        <main className="flex flex-col gap-7 pb-8">
          {CATEGORY_ORDER.map((c) => (
            <DiscoverySection
              key={c}
              title={t.category[c]}
              products={getByCategory(c)}
              merchants={merchantsById}
            />
          ))}
        </main>
      )}
    </>
  );
}
