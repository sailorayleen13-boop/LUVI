import {
  getAllMerchants,
  getByCategory,
  getMostLuvid,
  getNewArrivals,
  getTrending,
} from "@/lib/marketplace/queries";
import { DEFAULT_DISCOVERY_LOCATION } from "@/lib/marketplace/region-config";
import { t } from "@/lib/i18n";
import { DiscoveryHeader } from "@/components/marketplace/discovery-header";
import { DiscoverySection } from "@/components/marketplace/discovery-section";
import { MerchantCard } from "@/components/marketplace/merchant-card";
import { SectionHeader } from "@/components/home/section-header";
import { HorizontalScroller } from "@/components/home/horizontal-scroller";

/**
 * LUVI Home — the marketplace discovery experience (formerly the Phase 2
 * preview at /mp, now the primary entry point per Phase 3 decision A).
 * Trending / New Arrivals / Most LUVI'd / a category spotlight / Stores.
 * Drops and full category browsing live at /explore, not here.
 */
export default function Home() {
  const merchants = Object.fromEntries(getAllMerchants().map((m) => [m.id, m]));
  const allMerchants = getAllMerchants();

  return (
    <>
      <DiscoveryHeader location={DEFAULT_DISCOVERY_LOCATION} />

      <main className="flex flex-col gap-7 pb-8 pt-3">
        <DiscoverySection title={t.discovery.trending} products={getTrending()} merchants={merchants} />
        <DiscoverySection
          title={t.discovery.newArrivals}
          products={getNewArrivals()}
          merchants={merchants}
        />
        <DiscoverySection
          title={t.discovery.mostLuvid}
          products={getMostLuvid()}
          merchants={merchants}
        />
        <DiscoverySection
          title={t.discovery.cuteFinds}
          products={getByCategory("home")}
          merchants={merchants}
        />

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
