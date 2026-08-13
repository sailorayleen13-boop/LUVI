"use client";

import { useEffect } from "react";
import { Heart } from "lucide-react";
import type { Merchant, Product } from "@/lib/marketplace/types";
import { formatCurrency } from "@/lib/i18n/format-currency";
import { t } from "@/lib/i18n";
import { BRAND_CTA } from "@/lib/brand";
import { trackInteraction } from "@/lib/marketplace/interactions";
import { useSaveInteraction } from "@/lib/marketplace/use-save-interaction";
import { useOutboundClick } from "@/lib/marketplace/use-outbound-click";
import { MarketplaceHeader } from "@/components/marketplace/marketplace-header";
import { ProductImage } from "@/components/marketplace/product-image";
import { AvailabilityBadge } from "@/components/marketplace/availability-badge";
import { BadgePill } from "@/components/marketplace/badge-pill";
import { MerchantBlock } from "@/components/marketplace/merchant-block";
import { DiscoverySection } from "@/components/marketplace/discovery-section";

export function ProductDetailView({
  product,
  merchant,
  related,
  relatedMerchants,
}: {
  product: Product;
  merchant: Merchant;
  related: Product[];
  relatedMerchants: Record<string, Merchant>;
}) {
  const { saved, toggle } = useSaveInteraction(product);
  const { trigger, hasLink } = useOutboundClick(product, merchant);

  const purchasable =
    hasLink && (product.availability === "IN_STOCK" || product.availability === "PREORDER");
  const faded = product.availability === "SOLD_OUT";

  useEffect(() => {
    trackInteraction({
      type: "product_view",
      productId: product.id,
      merchantId: merchant.id,
      category: product.category,
    });
    // Track once per mounted product — re-fires only if the slug changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  return (
    <>
      <MarketplaceHeader title={product.name} />

      <main className="flex flex-col gap-5 pb-28">
        <div className="relative px-4 pt-2">
          <ProductImage
            emoji={product.images[0]}
            category={product.category}
            className="aspect-square w-full"
            faded={faded}
          />
          <button
            type="button"
            onClick={toggle}
            aria-label={saved ? "Quitar de LUVI List" : "Agregar a LUVI List"}
            aria-pressed={saved}
            className="absolute right-6 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/85 shadow-sm backdrop-blur-sm active:scale-90"
          >
            <Heart
              size={19}
              className={saved ? "animate-luvi-pop fill-fucsia text-fucsia" : "text-charcoal-soft"}
            />
          </button>
        </div>

        <div className="flex flex-col gap-3 px-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <AvailabilityBadge availability={product.availability} />
            {product.badges.map((badge) => (
              <BadgePill key={badge} type={badge} />
            ))}
          </div>

          <h1 className="font-display text-2xl font-semibold leading-tight text-charcoal">
            {product.name}
          </h1>

          <span className="font-display text-2xl font-bold text-charcoal">
            {formatCurrency(product.price, product.currency)}
          </span>

          {product.availability === "PREORDER" && product.deliveryEstimate && (
            <p className="text-[13px] font-medium text-fucsia-dark">
              {t.product.deliveryEstimatePrefix}: {product.deliveryEstimate}
            </p>
          )}

          <MerchantBlock merchant={merchant} />

          <p className="text-[14px] leading-relaxed text-charcoal-soft">{product.description}</p>
        </div>

        <DiscoverySection
          title={t.product.relatedHeading}
          products={related}
          merchants={relatedMerchants}
        />
      </main>

      <div
        className="sticky z-20 border-t border-charcoal/8 bg-cream/95 px-4 py-3 backdrop-blur-sm"
        style={{ bottom: "env(safe-area-inset-bottom)" }}
      >
        <button
          type="button"
          onClick={trigger}
          disabled={!purchasable}
          className="flex w-full items-center justify-center rounded-full bg-fucsia py-3.5 text-[15px] font-semibold text-white shadow-md transition active:scale-[0.98] disabled:bg-charcoal/10 disabled:text-charcoal-soft"
        >
          {purchasable ? BRAND_CTA : t.availability[product.availability]}
        </button>
      </div>
    </>
  );
}
