"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useWishlist } from "@/lib/store/wishlist-context";
import { useAuth } from "@/lib/store/auth-context";
import { getSavedProductsAction } from "@/lib/marketplace/actions";
import { t } from "@/lib/i18n";
import { TabHeader } from "@/components/marketplace/tab-header";
import { ProductCard } from "@/components/marketplace/product-card";
import type { Merchant, Product } from "@/lib/marketplace/types";

/**
 * Local wishlist ids (useWishlist) are always shown — that's still what
 * makes Saved work instantly and offline, anonymous or not (Decision 2).
 * When signed in, this ALSO fetches the server-side saved_products ids and
 * unions them in, so a product saved from a different device shows up
 * here too. As of Phase 7's catalog cutover, resolving those ids to full
 * Product/Merchant records happens server-side, in one call
 * (getSavedProductsAction): it also routes local ids through the legacy
 * mock-id migration (see legacy-id-migration.ts) so a pre-cutover local
 * save (an old "p1"-style id) is safely resolved or dropped rather than
 * ever reaching the database or crashing this page.
 */
export default function SavedPage() {
  const { productIds: localIds } = useWishlist();
  const { user } = useAuth();
  const [saved, setSaved] = useState<Array<{ product: Product; merchant: Merchant }>>([]);

  useEffect(() => {
    let cancelled = false;
    getSavedProductsAction(localIds)
      .then((result) => {
        if (!cancelled) setSaved(result);
      })
      .catch(() => {
        if (!cancelled) setSaved([]);
      });
    return () => {
      cancelled = true;
    };
  }, [localIds, user]);

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
