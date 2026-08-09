"use client";

import Link from "next/link";
import { Check, Heart, Plus } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { formatCRC } from "@/lib/format";
import { useWishlist } from "@/lib/store/wishlist-context";
import { useToast } from "@/lib/store/toast-context";
import { useProductActions } from "@/lib/product-actions";
import { BadgePill } from "@/components/product/badge-pill";
import { AvailabilityPill } from "@/components/product/availability-pill";
import { ProductImage } from "@/components/product/product-image";

export function ProductCard({ product }: { product: Product }) {
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { showToast } = useToast();
  const { presentation, trigger } = useProductActions(product);
  const [justAdded, setJustAdded] = useState(false);

  const wishlisted = isWishlisted(product.id);

  function handleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const nowWishlisted = toggleWishlist(product.id);
    showToast(
      nowWishlisted ? "Agregado a tu LUVI List 💕" : "Se quitó de tu LUVI List",
    );
  }

  function handleQuickAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    trigger(1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  }

  return (
    <Link
      href={`/p/${product.slug}`}
      className="group block w-full"
      aria-label={product.name}
    >
      <div className="relative">
        <ProductImage
          emoji={product.images[0]}
          category={product.category}
          className="aspect-square w-full"
          faded={presentation.faded}
        />

        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          <AvailabilityPill presentation={presentation} />
          {product.badges.slice(0, presentation.showPill ? 1 : 2).map((badge) => (
            <BadgePill key={badge} type={badge} />
          ))}
        </div>

        <button
          type="button"
          onClick={handleWishlist}
          aria-label={wishlisted ? "Quitar de LUVI List" : "Agregar a LUVI List"}
          aria-pressed={wishlisted}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 shadow-sm backdrop-blur-sm active:scale-90"
        >
          <Heart
            size={17}
            className={
              wishlisted
                ? "animate-luvi-pop fill-fucsia text-fucsia"
                : "text-charcoal-soft"
            }
          />
        </button>

        {presentation.showQuickAdd && (
          <button
            type="button"
            onClick={handleQuickAdd}
            aria-label={presentation.ctaLabel}
            className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-fucsia text-white shadow-md active:scale-90"
          >
            {justAdded ? (
              <Check size={18} className="animate-luvi-pop" />
            ) : (
              <Plus size={18} />
            )}
          </button>
        )}
      </div>

      <div className="mt-2 space-y-0.5">
        <p className="line-clamp-1 text-[13.5px] font-medium text-charcoal">
          {product.name}
        </p>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-[15px] font-semibold text-charcoal">
            {formatCRC(product.price)}
          </span>
          {product.compareAtPrice && (
            <span className="text-xs text-charcoal-faint line-through">
              {formatCRC(product.compareAtPrice)}
            </span>
          )}
        </div>
        {presentation.cardMicroCopy && (
          <p className="text-xs font-medium text-fucsia-dark">
            {presentation.cardMicroCopy}
          </p>
        )}
      </div>
    </Link>
  );
}
