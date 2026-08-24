import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getOwnedMerchant } from "@/lib/marketplace/supabase/merchant-repository";
import { MarketplaceHeader } from "@/components/marketplace/marketplace-header";
import { ProductForm } from "@/components/merchant/product-form";
import { t } from "@/lib/i18n";

export default async function NewFullProductPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/account");
  const merchant = await getOwnedMerchant(user.id).catch(() => null);
  if (!merchant) redirect("/sell");

  return (
    <>
      <MarketplaceHeader title={t.seller.fullPublishTitle} />
      <main className="flex flex-col gap-1 px-4 pb-10">
        <ProductForm merchantId={merchant.id} />
      </main>
    </>
  );
}
