"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useWishlist } from "@/lib/store/wishlist-context";
import { getMerchantById, getProductById } from "@/lib/marketplace/queries";
import { t } from "@/lib/i18n";
import { TabHeader } from "@/components/marketplace/tab-header";
import { ProductCard } from "@/components/marketplace/product-card";

/**
 * Reuses the existing WishlistProvider as-is (it's just string ids in
 * localStorage) — no second wishlist implementation. Resolves ids to
 * marketplace Product/Merchant pairs and renders with the same
 * ProductCard used everywhere else.
 */
export default function SavedPage() {
  const { productIds } = useWishlist();

  const saved = productIds.flatMap((id) => {
    const product = getProductById(id);
    if (!product) return [];
    const merchant = getMerchantById(product.merchantId);
    if (!merchant) return [];
    return [{ product, merchant }];
  });

  if (saved.length === 0) {
    return (
      <>
        <TabHeader title={t.saved.heading} />
        <div className="flex flex-col items-center gap-4 px-8 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-fucsia-light">
            <Heart size={26} className="text-fucsia-dark" />
          </div>
          <p className="font-display text-lg font-semibold text-charcoal">{t.saved.emptyTitle}</p>
          <p className="text-sm text-charcoal-faint">{t.saved.emptySubtitle}</p>
          <Link
            href="/"
            className="mt-2 rounded-full bg-fucsia px-6 py-3 text-sm font-semibold text-white shadow-md active:scale-95"
          >
            {t.saved.emptyCta}
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <TabHeader title={t.saved.heading} />
      <main className="grid grid-cols-2 gap-x-3 gap-y-5 px-4 pb-8 md:grid-cols-3 md:gap-x-4 md:gap-y-6 lg:grid-cols-4 lg:gap-x-5 xl:grid-cols-5">
        {saved.map(({ product, merchant }) => (
          <ProductCard key={product.id} product={product} merchant={merchant} />
        ))}
      </main>
    </>
  );
}
