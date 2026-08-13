"use client";

import Link from "next/link";
import { Heart, ArrowUpRight } from "lucide-react";
import type { Merchant, Product } from "@/lib/marketplace/types";
import { formatCurrency } from "@/lib/i18n/format-currency";
import { useSaveInteraction } from "@/lib/marketplace/use-save-interaction";
import { useOutboundClick } from "@/lib/marketplace/use-outbound-click";
import { BRAND_CTA } from "@/lib/brand";
import { BadgePill } from "@/components/marketplace/badge-pill";
import { AvailabilityBadge } from "@/components/marketplace/availability-badge";
import { ProductImage } from "@/components/marketplace/product-image";

export function ProductCard({ product, merchant }: { product: Product; merchant: Merchant }) {
  const { saved, toggle } = useSaveInteraction(product);
  const { trigger, hasLink } = useOutboundClick(product, merchant);

  const faded = product.availability === "SOLD_OUT";
  const quickActionable =
    hasLink && (product.availability === "IN_STOCK" || product.availability === "PREORDER");

  function handleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggle();
  }

  function handleQuickOutbound(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    trigger();
  }

  return (
    <Link href={`/mp/${product.slug}`} className="group block w-full" aria-label={product.name}>
      <div className="relative">
        <ProductImage
          emoji={product.images[0]}
          category={product.category}
          className="aspect-square w-full"
          faded={faded}
        />

        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {product.availability !== "IN_STOCK" && <AvailabilityBadge availability={product.availability} />}
          {product.badges.slice(0, product.availability !== "IN_STOCK" ? 1 : 2).map((badge) => (
            <BadgePill key={badge} type={badge} />
          ))}
        </div>

        <button
          type="button"
          onClick={handleSave}
          aria-label={saved ? "Quitar de LUVI List" : "Agregar a LUVI List"}
          aria-pressed={saved}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 shadow-sm backdrop-blur-sm active:scale-90"
        >
          <Heart
            size={17}
            className={saved ? "animate-luvi-pop fill-fucsia text-fucsia" : "text-charcoal-soft"}
          />
        </button>

        {quickActionable && (
          <button
            type="button"
            onClick={handleQuickOutbound}
            aria-label={BRAND_CTA}
            className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-fucsia text-white shadow-md active:scale-90"
          >
            <ArrowUpRight size={18} />
          </button>
        )}
      </div>

      <div className="mt-2 space-y-0.5">
        <p className="line-clamp-1 text-[13.5px] font-medium text-charcoal">{product.name}</p>
        <span className="font-display text-[15px] font-semibold text-charcoal">
          {formatCurrency(product.price, product.currency)}
        </span>
        <p className="line-clamp-1 text-[11px] text-charcoal-faint">
          {merchant.name}
          {merchant.location.city ? ` · ${merchant.location.city}` : ""}
        </p>
      </div>
    </Link>
  );
}
