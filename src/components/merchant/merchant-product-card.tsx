"use client";

import Link from "next/link";
import { formatCurrency } from "@/lib/i18n/format-currency";
import { setProductAvailabilityAction, archiveProductAction } from "@/lib/merchant/actions";
import { ProductImage } from "@/components/marketplace/product-image";
import { t } from "@/lib/i18n";
import type { OwnedProduct } from "@/lib/marketplace/supabase/merchant-repository";

/**
 * Merchant Dashboard's product tile (Phase 8 Section 10) — same visual
 * language as the public ProductCard (image/name/price front and center)
 * but with seller actions instead of save/outbound-click, and a status
 * chip that can say things a customer never sees ("Borrador", "Archivado").
 * Status is never color-only (Section 23): every chip carries its own text.
 */
export function MerchantProductCard({ product }: { product: OwnedProduct }) {
  const statusLabel = product.isDraft
    ? t.seller.statusDraft
    : product.status === "archived"
      ? t.seller.statusArchived
      : t.availability[product.availability];

  const statusClass = product.isDraft
    ? "bg-charcoal/10 text-charcoal-soft"
    : product.status === "archived"
      ? "bg-charcoal/10 text-charcoal-faint"
      : product.availability === "SOLD_OUT"
        ? "bg-red-50 text-red-600"
        : "bg-fucsia-light text-fucsia-dark";

  const nextAvailability = product.availability === "SOLD_OUT" ? "IN_STOCK" : "SOLD_OUT";
  const canToggleAvailability = !product.isDraft && product.status !== "archived";

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-charcoal/8 p-2.5">
      <Link href={`/merchant/products/${product.id}/edit`} className="block">
        <ProductImage
          emoji={product.images[0] ?? "📦"}
          category={product.category}
          className="aspect-square w-full"
          faded={product.status === "archived"}
        />
      </Link>

      <div className="flex flex-col gap-1">
        <span className={`w-fit rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${statusClass}`}>
          {statusLabel}
        </span>
        <p className="line-clamp-1 text-[13px] font-medium text-charcoal">{product.name}</p>
        <span className="font-display text-[14.5px] font-semibold text-charcoal">
          {formatCurrency(product.price, product.currency)}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Link
          href={`/merchant/products/${product.id}/edit`}
          className="rounded-full border border-charcoal/10 px-2.5 py-1 text-[11px] font-semibold text-charcoal-soft active:bg-charcoal/[0.03]"
        >
          {t.seller.editCta}
        </Link>

        {canToggleAvailability && (
          <form action={setProductAvailabilityAction}>
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="availability" value={nextAvailability} />
            <button
              type="submit"
              className="rounded-full border border-charcoal/10 px-2.5 py-1 text-[11px] font-semibold text-charcoal-soft active:bg-charcoal/[0.03]"
            >
              {nextAvailability === "SOLD_OUT" ? t.seller.markSoldOutCta : t.seller.markAvailableCta}
            </button>
          </form>
        )}

        {product.status !== "archived" && (
          <form
            action={archiveProductAction}
            onSubmit={(e) => {
              if (!confirm(t.seller.archiveConfirm)) e.preventDefault();
            }}
          >
            <input type="hidden" name="productId" value={product.id} />
            <button
              type="submit"
              className="rounded-full border border-charcoal/10 px-2.5 py-1 text-[11px] font-semibold text-charcoal-soft active:bg-charcoal/[0.03]"
            >
              {t.seller.archiveCta}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
