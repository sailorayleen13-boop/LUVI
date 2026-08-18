"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Heart, Home, Store, User } from "lucide-react";
import { useWishlist } from "@/lib/store/wishlist-context";
import { t } from "@/lib/i18n";

const TABS = [
  { href: "/", label: t.nav.home, icon: Home },
  { href: "/explore", label: t.nav.explore, icon: Compass },
  { href: "/saved", label: t.nav.saved, icon: Heart },
  { href: "/stores", label: t.nav.stores, icon: Store },
  { href: "/account", label: t.nav.account, icon: User },
] as const;

/**
 * Primary navigation for the marketplace (Phase 3). Replaces the ecommerce
 * MVP's cart-focused BottomNav (src/components/layout/bottom-nav.tsx),
 * which stays in the repo unreferenced for rollback rather than being
 * deleted — the legacy /cart, /checkout, /p/[slug] flow still uses its own
 * BackHeader internally and keeps compiling on its own.
 */
export function BottomNav() {
  const pathname = usePathname();
  const { productIds } = useWishlist();

  return (
    <nav className="sticky bottom-0 z-30 flex items-stretch justify-around border-t border-charcoal/8 bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        const badgeCount = href === "/saved" ? productIds.length : 0;

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
                fill={active && href === "/saved" ? "currentColor" : "none"}
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
