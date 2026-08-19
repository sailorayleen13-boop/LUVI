import { getAllMerchants, getProductsByMerchant } from "@/lib/marketplace/catalog";
import { t } from "@/lib/i18n";
import { TabHeader } from "@/components/marketplace/tab-header";
import { MerchantDirectoryCard } from "@/components/marketplace/merchant-directory-card";

/** Lightweight merchant directory. No search/filtering yet — that's Phase 4. */
export default async function StoresPage() {
  const merchants = await getAllMerchants();
  const productCounts = await Promise.all(merchants.map((m) => getProductsByMerchant(m.id)));

  return (
    <>
      <TabHeader title={t.stores.heading} subtitle={t.stores.subtitle} />
      <main className="grid grid-cols-1 gap-3 px-4 pb-8 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
        {merchants.map((merchant, i) => (
          <MerchantDirectoryCard key={merchant.id} merchant={merchant} productCount={productCounts[i].length} />
        ))}
      </main>
    </>
  );
}
