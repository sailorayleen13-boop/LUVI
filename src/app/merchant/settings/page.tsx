import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getOwnedMerchant } from "@/lib/marketplace/supabase/merchant-repository";
import { MarketplaceHeader } from "@/components/marketplace/marketplace-header";
import { StoreForm } from "@/components/merchant/store-form";
import { t } from "@/lib/i18n";

export default async function MerchantSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/account");

  const merchant = await getOwnedMerchant(user.id).catch(() => null);
  if (!merchant) redirect("/sell");

  return (
    <>
      <MarketplaceHeader title={t.seller.settingsTitle} />
      <main className="flex flex-col gap-4 px-4 pb-10">
        <StoreForm mode="edit" merchant={merchant} />
      </main>
    </>
  );
}
