"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/store/cart-context";

export function BackHeader({ title }: { title?: string }) {
  const router = useRouter();
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 bg-cream/95 px-2 pb-3 pt-[calc(14px+env(safe-area-inset-top))] backdrop-blur-sm">
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Volver"
        className="flex h-10 w-10 flex-none items-center justify-center rounded-full active:bg-charcoal/5"
      >
        <ChevronLeft size={24} className="text-charcoal" />
      </button>
      <p className="line-clamp-1 flex-1 text-center text-[15px] font-semibold text-charcoal">
        {title}
      </p>
      <Link
        href="/cart"
        aria-label="Carrito"
        className="relative flex h-10 w-10 flex-none items-center justify-center rounded-full active:bg-charcoal/5"
      >
        <ShoppingBag size={20} className="text-charcoal" strokeWidth={2.2} />
        {itemCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-fucsia px-1 text-[10px] font-bold text-white">
            {itemCount}
          </span>
        )}
      </Link>
    </header>
  );
}
