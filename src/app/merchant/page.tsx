import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Settings, ExternalLink } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getOwnedMerchant, getMerchantProducts } from "@/lib/marketplace/supabase/merchant-repository";
import { MerchantLogo } from "@/components/marketplace/merchant-logo";
import { MerchantProductCard } from "@/components/merchant/merchant-product-card";
import { TabHeader } from "@/components/marketplace/tab-header";
import { t } from "@/lib/i18n";

/**
 * Merchant Dashboard V1 (Phase 8 Section 10) — store header (name/preview/
 * settings), "+ Agregar producto", and a visual product grid. Deliberately
 * NOT enterprise inventory software: no bulk tools, no analytics, just
 * enough to see and manage what's already published/draft/archived.
 */
export default async function MerchantDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/account");

  const merchant = await getOwnedMerchant(user.id).catch(() => null);
  if (!merchant) redirect("/sell");

  const products = await getMerchantProducts(merchant.id).catch(() => []);

  return (
    <>
      <TabHeader title={t.seller.dashboardTitle} />
      <main className="flex flex-col gap-5 px-4 pb-24">
        <div className="flex items-center gap-3 rounded-2xl border border-charcoal/8 p-4">
          <MerchantLogo logo={merchant.logo || "🏪"} className="h-12 w-12 text-2xl" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-charcoal">{merchant.name}</p>
            <p className="truncate text-[12px] text-charcoal-faint">
              {[merchant.location.city, merchant.location.region].filter(Boolean).join(", ")}
            </p>
          </div>
          <Link
            href={`/m/${merchant.slug}`}
            aria-label={t.seller.viewStoreCta}
            className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-fucsia-light active:scale-95"
          >
            <ExternalLink size={16} className="text-fucsia-dark" />
          </Link>
          <Link
            href="/merchant/settings"
            aria-label={t.seller.settingsCta}
            className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-charcoal/5 active:scale-95"
          >
            <Settings size={16} className="text-charcoal-soft" />
          </Link>
        </div>

        <Link
          href="/merchant/products/new"
          className="flex items-center justify-center gap-2 rounded-full bg-fucsia py-3.5 text-[15px] font-semibold text-white shadow-md active:scale-[0.98]"
        >
          <Plus size={18} />
          {t.seller.addProductCta}
        </Link>

        <div className="flex flex-col gap-3">
          <p className="text-[13px] font-semibold text-charcoal">{t.seller.productsHeading}</p>

          {products.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-cream-soft px-5 py-10 text-center">
              <p className="text-[14px] font-semibold text-charcoal">{t.seller.emptyProductsTitle}</p>
              <p className="text-[12.5px] text-charcoal-faint">{t.seller.emptyProductsSubtitle}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <MerchantProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
