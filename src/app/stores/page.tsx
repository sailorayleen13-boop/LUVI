import { getAllMerchants, getProductsByMerchant } from "@/lib/marketplace/queries";
import { t } from "@/lib/i18n";
import { TabHeader } from "@/components/marketplace/tab-header";
import { MerchantDirectoryCard } from "@/components/marketplace/merchant-directory-card";

/** Lightweight merchant directory. No search/filtering yet — that's Phase 4. */
export default function StoresPage() {
  const merchants = getAllMerchants();

  return (
    <>
      <TabHeader title={t.stores.heading} subtitle={t.stores.subtitle} />
      <main className="flex flex-col gap-3 px-4 pb-8">
        {merchants.map((merchant) => (
          <MerchantDirectoryCard
            key={merchant.id}
            merchant={merchant}
            productCount={getProductsByMerchant(merchant.id).length}
          />
        ))}
      </main>
    </>
  );
}
