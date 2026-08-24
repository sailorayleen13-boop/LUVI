import {
  getAllDrops,
  getAllMerchants,
  getByCategory,
  getMostLuvid,
  getNewArrivals,
  getTrending,
} from "@/lib/marketplace/catalog";
import { DEFAULT_DISCOVERY_LOCATION } from "@/lib/marketplace/region-config";
import { getPersonalizedHomeSection } from "@/lib/marketplace/personalized-home";
import { t } from "@/lib/i18n";
import { DiscoveryHeader } from "@/components/marketplace/discovery-header";
import { DiscoverySection } from "@/components/marketplace/discovery-section";
import { MerchantCard } from "@/components/marketplace/merchant-card";
import { DropCard } from "@/components/marketplace/drop-card";
import { SectionHeader } from "@/components/home/section-header";
import { HorizontalScroller } from "@/components/home/horizontal-scroller";

/**
 * LUVI Home — the marketplace discovery experience (formerly the Phase 2
 * preview at /mp, now the primary entry point per Phase 3 decision A).
 * "Para ti" (Phase 7) / Trending / New Arrivals / Most LUVI'd / LUVI Drops
 * / a category spotlight / Stores. Full category browsing + filters live
 * at /explore.
 *
 * As of Phase 7's catalog cutover every section below reads from the real
 * Supabase-seeded catalog via lib/marketplace/catalog.ts (falls back to
 * the mock catalog only if Supabase itself is unreachable).
 *
 * "Para ti" is additive: for an anonymous visitor, or a signed-in user
 * with no taste signals yet (cold-start), getPersonalizedHomeSection()
 * comes back empty and Home renders exactly as it did before Phase 7 —
 * the existing discovery sections are the fallback, not a separate code
 * path (see that function's docstring for the fail-closed contract).
 */
export default async function Home() {
  const [allMerchants, drops, trending, newArrivals, mostLuvid, cuteFinds, { recommendations }] =
    await Promise.all([
      getAllMerchants(),
      getAllDrops(),
      getTrending(),
      getNewArrivals(),
      getMostLuvid(),
      getByCategory("home"),
      getPersonalizedHomeSection(),
    ]);
  const merchants = Object.fromEntries(allMerchants.map((m) => [m.id, m]));

  return (
    <>
      <DiscoveryHeader location={DEFAULT_DISCOVERY_LOCATION} />

      <main className="flex flex-col gap-7 pb-8 pt-3">
        {recommendations.length > 0 && (
          <DiscoverySection title={t.discovery.forYou} products={recommendations} merchants={merchants} />
        )}
        <DiscoverySection title={t.discovery.trending} products={trending} merchants={merchants} />
        <DiscoverySection title={t.discovery.newArrivals} products={newArrivals} merchants={merchants} />
        <DiscoverySection title={t.discovery.mostLuvid} products={mostLuvid} merchants={merchants} />

        {drops.length > 0 && (
          <section className="flex flex-col gap-3">
            <SectionHeader title={t.drops.heading} />
            <HorizontalScroller>
              {drops.map((drop) => (
                <DropCard key={drop.id} drop={drop} />
              ))}
            </HorizontalScroller>
          </section>
        )}

        <DiscoverySection title={t.discovery.cuteFinds} products={cuteFinds} merchants={merchants} />

        <section className="flex flex-col gap-3">
          <SectionHeader title={t.discovery.storesHeading} />
          <HorizontalScroller>
            {allMerchants.map((merchant) => (
              <MerchantCard key={merchant.id} merchant={merchant} />
            ))}
          </HorizontalScroller>
        </section>
      </main>
    </>
  );
}
