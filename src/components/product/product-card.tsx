"use client";

import Link from "next/link";
import { Heart, Plus, Check } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { formatCRC } from "@/lib/format";
import { useCart } from "@/lib/store/cart-context";
import { useWishlist } from "@/lib/store/wishlist-context";
import { useToast } from "@/lib/store/toast-context";
import { BadgePill } from "@/components/product/badge-pill";
import { ProductImage } from "@/components/product/product-image";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { showToast } = useToast();
  const [justAdded, setJustAdded] = useState(false);

  const soldOut = product.badges.includes("sold-out") || product.stock <= 0;
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
    if (soldOut) return;
    addItem(product.id, 1);
    showToast(`${product.name} — LUVI IT! 🛍️`);
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
          soldOut={soldOut}
        />

        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {product.badges
            .filter((b) => b !== "sold-out" || soldOut)
            .slice(0, 2)
            .map((badge) => (
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

        {!soldOut && (
          <button
            type="button"
            onClick={handleQuickAdd}
            aria-label="Agregar rápido al carrito"
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
        {!soldOut && product.stock <= 3 && (
          <p className="text-xs font-medium text-fucsia-dark">
            Solo quedan {product.stock} 👀
          </p>
        )}
      </div>
    </Link>
  );
}
