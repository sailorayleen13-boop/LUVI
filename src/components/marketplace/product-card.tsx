"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, ArrowUpRight, RotateCcw } from "lucide-react";
import type { Merchant, Product } from "@/lib/marketplace/types";
import { formatCurrency } from "@/lib/i18n/format-currency";
import { useSaveInteraction } from "@/lib/marketplace/use-save-interaction";
import { useOutboundClick } from "@/lib/marketplace/use-outbound-click";
import { isHiddenFromDiscovery, clearDiscoveryFeedback } from "@/lib/marketplace/discovery-feedback";
import { BRAND_CTA } from "@/lib/brand";
import { BadgePill } from "@/components/marketplace/badge-pill";
import { AvailabilityBadge } from "@/components/marketplace/availability-badge";
import { ProductImage } from "@/components/marketplace/product-image";
import { DiscoveryFeedbackMenu } from "@/components/marketplace/discovery-feedback-menu";
import { t } from "@/lib/i18n";

export function ProductCard({
  product,
  merchant,
  rank,
}: {
  product: Product;
  merchant: Merchant;
  /** 1-based position badge for the "ranked" DiscoverySection variant (Trending's top 3). Omit for an unranked card. */
  rank?: number;
}) {
  const { saved, toggle } = useSaveInteraction(product);
  const { trigger, hasLink } = useOutboundClick(product, merchant);
  // Starts false on every render (server and first client render must
  // match) and only flips true from an effect, same hydrate-after-mount
  // pattern as useWishlist's localStorage read — avoids a hydration
  // mismatch at the cost of a one-frame flash for an already-dismissed card.
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Deferred into a microtask rather than calling setState synchronously
    // in the effect body — same rule auth-context.tsx follows for its
    // post-mount state sync.
    if (isHiddenFromDiscovery(product.id)) {
      void Promise.resolve().then(() => setDismissed(true));
    }
  }, [product.id]);

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

  function handleUndo(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    clearDiscoveryFeedback(product.id);
    setDismissed(false);
  }

  if (dismissed) {
    return (
      <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl bg-cream-soft px-3 text-center">
        <p className="text-[12px] text-charcoal-faint">{t.feedback.hiddenLabel}</p>
        <button
          type="button"
          onClick={handleUndo}
          className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-charcoal-soft shadow-sm active:scale-95"
        >
          <RotateCcw size={13} />
          {t.feedback.undo}
        </button>
      </div>
    );
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

        {rank && (
          <span className="absolute -left-1.5 -top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-charcoal text-[11px] font-bold text-cream shadow-sm">
            {rank}
          </span>
        )}

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

        <DiscoveryFeedbackMenu product={product} onNotInterested={() => setDismissed(true)} />

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
