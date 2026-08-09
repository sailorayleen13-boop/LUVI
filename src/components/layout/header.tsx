"use client";

import Link from "next/link";
import { Heart, Search, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/store/cart-context";

export function Header() {
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between bg-cream/95 px-4 pb-3 pt-[calc(14px+env(safe-area-inset-top))] backdrop-blur-sm">
      <Link href="/" className="flex items-center gap-0.5">
        <span className="font-display text-2xl font-bold tracking-tight text-charcoal">
          LUVI
        </span>
        <Heart size={13} className="-translate-y-1.5 fill-fucsia text-fucsia" />
      </Link>

      <div className="flex items-center gap-1">
        <Link
          href="/search"
          aria-label="Buscar"
          className="flex h-10 w-10 items-center justify-center rounded-full active:bg-charcoal/5"
        >
          <Search size={21} className="text-charcoal" strokeWidth={2.2} />
        </Link>
        <Link
          href="/cart"
          aria-label="Carrito"
          className="relative flex h-10 w-10 items-center justify-center rounded-full active:bg-charcoal/5"
        >
          <ShoppingBag size={21} className="text-charcoal" strokeWidth={2.2} />
          {itemCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-fucsia px-1 text-[10px] font-bold text-white">
              {itemCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
