"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import type { Merchant, Product } from "@/lib/marketplace/types";
import { formatCurrency } from "@/lib/i18n/format-currency";
import { useSaveInteraction } from "@/lib/marketplace/use-save-interaction";
import { ProductImage } from "@/components/marketplace/product-image";

/**
 * Compact horizontal list row — the "stack" DiscoverySection variant's
 * item (see Most LUVI'd on Home). Same product data, save behavior, and
 * navigation target as the square ProductCard, just laid out as a
 * thumbnail + text row instead of a vertical card, so a few of these
 * stacked in one column reads as a genuinely different rhythm from the
 * square-grid rows above/below it — not a second product-card component
 * to maintain in parallel, just a different template around the same
 * useSaveInteraction hook. Deliberately no feedback kebab here (Trending's
 * ranked cards already carry it) — keeping this row lean is the point.
 */
export function CompactProductRow({ product, merchant }: { product: Product; merchant: Merchant }) {
  const { saved, toggle } = useSaveInteraction(product);

  function handleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggle();
  }

  return (
    <Link
      href={`/mp/${product.slug}`}
      className="flex items-center gap-2.5 rounded-xl px-1 py-1.5 active:bg-charcoal/[0.03]"
      aria-label={product.name}
    >
      <ProductImage
        emoji={product.images[0]}
        category={product.category}
        className="h-14 w-14 flex-none"
        faded={product.availability === "SOLD_OUT"}
      />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-[13px] font-medium text-charcoal">{product.name}</p>
        <p className="line-clamp-1 text-[10.5px] text-charcoal-faint">{merchant.name}</p>
        <span className="font-display text-[13.5px] font-semibold text-charcoal">
          {formatCurrency(product.price, product.currency)}
        </span>
      </div>
      <button
        type="button"
        onClick={handleSave}
        aria-label={saved ? "Quitar de LUVI List" : "Agregar a LUVI List"}
        aria-pressed={saved}
        className="flex h-8 w-8 flex-none items-center justify-center rounded-full active:bg-charcoal/5"
      >
        <Heart size={16} className={saved ? "animate-luvi-pop fill-fucsia text-fucsia" : "text-charcoal-faint"} />
      </button>
    </Link>
  );
}
