import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getOwnedMerchant } from "@/lib/marketplace/supabase/merchant-repository";
import { MarketplaceHeader } from "@/components/marketplace/marketplace-header";
import { StoreForm } from "@/components/merchant/store-form";
import { t } from "@/lib/i18n";

/**
 * The entire "become a seller" flow (Phase 8 Section 4) — one screen, three
 * questions (name / location / contact), nothing about slugs, merchant ids,
 * or listing architecture. A signed-out visitor lands on /account instead
 * (sign-up/sign-in already lives there); an existing seller is bounced
 * straight to their dashboard rather than seeing a second "create store" form.
 */
export default async function SellPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/account");

  const existing = await getOwnedMerchant(user.id).catch(() => null);
  if (existing) redirect("/merchant");

  return (
    <>
      <MarketplaceHeader title={t.seller.sellTitle} />
      <main className="flex flex-col gap-1 px-4 pb-10">
        <p className="pb-3 text-[13.5px] text-charcoal-faint">{t.seller.sellSubtitle}</p>
        <StoreForm mode="create" />
      </main>
    </>
  );
}
