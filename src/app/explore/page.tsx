import { getAllMerchants, getByCategory } from "@/lib/marketplace/queries";
import type { Category } from "@/lib/marketplace/types";
import { t } from "@/lib/i18n";
import { TabHeader } from "@/components/marketplace/tab-header";
import { DiscoverySection } from "@/components/marketplace/discovery-section";

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

/**
 * Category browse, one section per category. No search/filtering logic —
 * that's Phase 4. DiscoverySection already no-ops for empty categories, so
 * this stays correct as coverage grows or shrinks.
 */
export default function ExplorePage() {
  const merchants = Object.fromEntries(getAllMerchants().map((m) => [m.id, m]));

  return (
    <>
      <TabHeader title={t.explore.heading} subtitle={t.explore.subtitle} />
      <main className="flex flex-col gap-7 pb-8">
        {CATEGORY_ORDER.map((category) => (
          <DiscoverySection
            key={category}
            title={t.category[category]}
            products={getByCategory(category)}
            merchants={merchants}
          />
        ))}
      </main>
    </>
  );
}
