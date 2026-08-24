import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getOwnedMerchant } from "@/lib/marketplace/supabase/merchant-repository";
import { MarketplaceHeader } from "@/components/marketplace/marketplace-header";
import { QuickPublishForm } from "@/components/merchant/quick-publish-form";
import { t } from "@/lib/i18n";

export default async function QuickPublishPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/account");
  const merchant = await getOwnedMerchant(user.id).catch(() => null);
  if (!merchant) redirect("/sell");

  return (
    <>
      <MarketplaceHeader title={t.seller.quickPublishTitle} />
      <main className="flex flex-col gap-1 px-4 pb-10">
        <QuickPublishForm merchantId={merchant.id} />
      </main>
    </>
  );
}
