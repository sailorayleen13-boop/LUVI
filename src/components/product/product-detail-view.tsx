"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import type { Drop, Product } from "@/lib/types";
import { formatCRC } from "@/lib/format";
import { useWishlist } from "@/lib/store/wishlist-context";
import { useProductActions } from "@/lib/product-actions";
import { BackHeader } from "@/components/layout/back-header";
import { ProductImage } from "@/components/product/product-image";
import { AvailabilityPill } from "@/components/product/availability-pill";
import { BadgePill } from "@/components/product/badge-pill";
import { DropCountdown } from "@/components/product/drop-countdown";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { DiscoverySection } from "@/components/home/discovery-section";

export function ProductDetailView({
  product,
  related,
  drop,
}: {
  product: Product;
  related: Product[];
  drop?: Drop;
}) {
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { presentation, trigger, alreadyInterested, alreadyRequestedNotify } =
    useProductActions(product);
  const [quantity, setQuantity] = useState(1);
  const wishlisted = isWishlisted(product.id);

  const isPurchasable =
    presentation.ctaKind === "add-to-cart" || presentation.ctaKind === "preorder";
  const alreadyDone =
    (presentation.ctaKind === "interest" && alreadyInterested) ||
    (presentation.ctaKind === "notify" && alreadyRequestedNotify);

  function handleCta() {
    if (alreadyDone) return;
    trigger(quantity);
  }

  const ctaButtonClass =
    presentation.ctaKind === "notify"
      ? "border-2 border-charcoal text-charcoal"
      : "bg-fucsia text-white";

  const ctaText = alreadyDone
    ? presentation.ctaKind === "interest"
      ? "¡Ya estás anotado! 💗"
      : "Ya te vamos a avisar 🔔"
    : isPurchasable
      ? `${presentation.ctaKind === "add-to-cart" ? "LUVI IT!" : "PRE-ORDER"} — ${formatCRC(product.price * quantity)}`
      : presentation.ctaLabel;

  return (
    <>
      <BackHeader title={product.name} />

      <main className="flex flex-col gap-5 pb-6">
        <div className="relative px-4 pt-2">
          <ProductImage
            emoji={product.images[0]}
            category={product.category}
            className="aspect-square w-full"
            faded={presentation.faded}
          />
          <button
            type="button"
            onClick={() => toggleWishlist(product.id)}
            aria-label={wishlisted ? "Quitar de LUVI List" : "Agregar a LUVI List"}
            aria-pressed={wishlisted}
            className="absolute right-6 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/85 shadow-sm backdrop-blur-sm active:scale-90"
          >
            <Heart
              size={19}
              className={
                wishlisted
                  ? "animate-luvi-pop fill-fucsia text-fucsia"
                  : "text-charcoal-soft"
              }
            />
          </button>
        </div>

        <div className="flex flex-col gap-3 px-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <AvailabilityPill presentation={presentation} />
            {product.badges.map((badge) => (
              <BadgePill key={badge} type={badge} />
            ))}
          </div>

          <h1 className="font-display text-2xl font-semibold leading-tight text-charcoal">
            {product.name}
          </h1>

          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-charcoal">
              {formatCRC(product.price)}
            </span>
            {product.compareAtPrice && (
              <span className="text-sm text-charcoal-faint line-through">
                {formatCRC(product.compareAtPrice)}
              </span>
            )}
          </div>

          <div className="rounded-2xl bg-cream-soft p-4">
            <p className="font-display text-lg font-semibold text-charcoal">
              {presentation.headline}
            </p>
            <ul className="mt-1.5 space-y-1">
              {presentation.supportingLines.map((line) => (
                <li key={line} className="text-[13.5px] leading-snug text-charcoal-soft">
                  {line}
                </li>
              ))}
            </ul>
            {drop && presentation.ctaKind === "preorder" && (
              <div className="mt-3">
                <DropCountdown
                  closeDate={drop.closeDate}
                  label={`LUVI DROP ${String(drop.number).padStart(3, "0")} · ${drop.name} cierra en`}
                />
              </div>
            )}
          </div>

          {isPurchasable && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-charcoal-soft">Cantidad</span>
              <QuantityStepper quantity={quantity} onChange={setQuantity} />
            </div>
          )}

          <p className="text-[14px] leading-relaxed text-charcoal-soft">
            {product.description}
          </p>
        </div>

        {related.length > 0 && (
          <DiscoverySection title="También te puede LUVI" products={related} />
        )}
      </main>

      <div
        className="sticky z-20 border-t border-charcoal/8 bg-cream/95 px-4 py-3 backdrop-blur-sm"
        style={{ bottom: "calc(64px + env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={handleCta}
          disabled={alreadyDone}
          className={`flex w-full items-center justify-center rounded-full py-3.5 text-[15px] font-semibold shadow-md transition active:scale-[0.98] disabled:opacity-60 ${ctaButtonClass}`}
        >
          {ctaText}
        </button>
      </div>
    </>
  );
}
