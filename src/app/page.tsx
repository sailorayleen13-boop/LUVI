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
import { dailyRotationSeed, rotateByDailySeed } from "@/lib/marketplace/discovery-rotation";
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
 *
 * Discovery UX pass: sections no longer all look like identical "row of
 * square cards" — "Para ti" gets a tinted spotlight treatment, Trending
 * gets numbered rank badges on its top 3, Most LUVI'd renders as compact
 * stacked list columns instead of a second square grid (see
 * DiscoverySection's `variant` prop). None of Trending/New Arrivals/Most
 * LUVI'd/"Para ti"'s actual ORDER changes — that order is Recommendation
 * Engine V1's ranking and stays exactly as scored. The category spotlight
 * and Stores rows carry no ranking signal to begin with, so those two use
 * lib/marketplace/discovery-rotation.ts's deterministic daily rotation to
 * keep Home from looking byte-identical on every repeat visit.
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

  const rotatedCuteFinds = rotateByDailySeed(cuteFinds, dailyRotationSeed("home-category-spotlight"));
  const rotatedMerchants = rotateByDailySeed(allMerchants, dailyRotationSeed("home-stores-row"));

  const hasAnyContent =
    recommendations.length > 0 ||
    trending.length > 0 ||
    newArrivals.length > 0 ||
    mostLuvid.length > 0 ||
    drops.length > 0 ||
    cuteFinds.length > 0 ||
    allMerchants.length > 0;

  return (
    <>
      <DiscoveryHeader location={DEFAULT_DISCOVERY_LOCATION} />

      {!hasAnyContent ? (
        <div className="flex flex-col items-center gap-2 px-8 py-20 text-center">
          <p className="font-display text-lg font-semibold text-charcoal">{t.discovery.emptyTitle}</p>
          <p className="text-sm text-charcoal-faint">{t.discovery.emptySubtitle}</p>
        </div>
      ) : (
        <main className="flex flex-col gap-7 pb-8 pt-3">
          {recommendations.length > 0 && (
            <DiscoverySection
              title={t.discovery.forYou}
              products={recommendations}
              merchants={merchants}
              variant="spotlight"
            />
          )}
          <DiscoverySection title={t.discovery.trending} products={trending} merchants={merchants} variant="ranked" />
          <DiscoverySection title={t.discovery.newArrivals} products={newArrivals} merchants={merchants} />
          <DiscoverySection
            title={t.discovery.mostLuvid}
            products={mostLuvid}
            merchants={merchants}
            variant="stack"
          />

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

          <DiscoverySection title={t.discovery.cuteFinds} products={rotatedCuteFinds} merchants={merchants} />

          <section className="flex flex-col gap-3">
            <SectionHeader title={t.discovery.storesHeading} />
            <HorizontalScroller>
              {rotatedMerchants.map((merchant) => (
                <MerchantCard key={merchant.id} merchant={merchant} />
              ))}
            </HorizontalScroller>
          </section>
        </main>
      )}
    </>
  );
}
