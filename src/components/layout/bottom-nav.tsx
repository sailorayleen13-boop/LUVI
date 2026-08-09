"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Heart, Home, ShoppingBag, User } from "lucide-react";
import { useCart } from "@/lib/store/cart-context";
import { useWishlist } from "@/lib/store/wishlist-context";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/trending", label: "Trending", icon: Flame },
  { href: "/wishlist", label: "LUVI List", icon: Heart },
  { href: "/cart", label: "Cart", icon: ShoppingBag },
  { href: "/account", label: "Cuenta", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { productIds } = useWishlist();

  return (
    <nav className="sticky bottom-0 z-30 flex items-stretch justify-around border-t border-charcoal/8 bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        const badgeCount =
          href === "/cart" ? itemCount : href === "/wishlist" ? productIds.length : 0;

        return (
          <Link
            key={href}
            href={href}
            className="flex flex-1 flex-col items-center gap-0.5 py-2.5"
          >
            <span className="relative">
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 2}
                className={active ? "text-fucsia" : "text-charcoal-faint"}
                fill={active && href === "/wishlist" ? "currentColor" : "none"}
              />
              {badgeCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-fucsia px-1 text-[9px] font-bold text-white">
                  {badgeCount}
                </span>
              )}
            </span>
            <span
              className={`text-[10px] font-medium ${active ? "text-fucsia" : "text-charcoal-faint"}`}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
