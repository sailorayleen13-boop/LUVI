import Link from "next/link";
import { redirect } from "next/navigation";
import { Zap, ListPlus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getOwnedMerchant } from "@/lib/marketplace/supabase/merchant-repository";
import { MarketplaceHeader } from "@/components/marketplace/marketplace-header";
import { t } from "@/lib/i18n";

/**
 * "+ Agregar producto" lands here first (Phase 8 Section 5) — the fork
 * between Publicación rápida (photos → name → price → publish) and Crear
 * publicación completa. Both paths are the SAME underlying product form
 * philosophy at different levels of progressive disclosure, not two
 * separate products or account modes.
 */
export default async function NewProductChoicePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/account");
  const merchant = await getOwnedMerchant(user.id).catch(() => null);
  if (!merchant) redirect("/sell");

  return (
    <>
      <MarketplaceHeader title={t.seller.newProductTitle} />
      <main className="flex flex-col gap-3 px-4 pb-10">
        <Link
          href="/merchant/products/new/quick"
          className="flex items-center gap-3 rounded-2xl border border-charcoal/8 bg-gradient-to-br from-fucsia-light/50 to-cream-soft p-4 active:bg-charcoal/[0.03]"
        >
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-fucsia-light">
            <Zap size={20} className="text-fucsia-dark" />
          </span>
          <div>
            <p className="text-[15px] font-semibold text-charcoal">{t.seller.quickPublishTitle}</p>
            <p className="text-[12.5px] text-charcoal-faint">{t.seller.quickPublishSubtitle}</p>
          </div>
        </Link>

        <Link
          href="/merchant/products/new/full"
          className="flex items-center gap-3 rounded-2xl border border-charcoal/8 p-4 active:bg-charcoal/[0.03]"
        >
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-charcoal/5">
            <ListPlus size={20} className="text-charcoal-soft" />
          </span>
          <div>
            <p className="text-[15px] font-semibold text-charcoal">{t.seller.fullPublishTitle}</p>
            <p className="text-[12.5px] text-charcoal-faint">{t.seller.fullPublishSubtitle}</p>
          </div>
        </Link>
      </main>
    </>
  );
}
