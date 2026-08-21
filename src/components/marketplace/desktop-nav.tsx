"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Heart, Home, Search, Store, User } from "lucide-react";
import { useWishlist } from "@/lib/store/wishlist-context";
import { BRAND_NAME } from "@/lib/brand";
import { t } from "@/lib/i18n";

const LINKS = [
  { href: "/", label: t.nav.home, icon: Home },
  { href: "/explore", label: t.nav.explore, icon: Compass },
  { href: "/saved", label: t.nav.saved, icon: Heart },
  { href: "/stores", label: t.nav.stores, icon: Store },
  { href: "/account", label: t.nav.account, icon: User },
] as const;

/**
 * Large-screen (lg+, >=1024px) top navigation — same destinations as
 * BottomNav, laid out as a persistent horizontal site header instead of a
 * bottom tab bar, which reads as mobile-app chrome pinned awkwardly to the
 * bottom of a large viewport. Hidden below lg; BottomNav hides at lg and up
 * (see bottom-nav.tsx's lg:hidden), so exactly one of the two renders at
 * any given width.
 */
export function DesktopNav() {
  const pathname = usePathname();
  const { productIds } = useWishlist();

  return (
    <header className="sticky top-0 z-40 hidden h-16 flex-none items-center border-b border-charcoal/8 bg-cream/95 backdrop-blur-sm lg:flex">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-8">
        <Link href="/" className="flex items-center gap-0.5">
          <span className="font-display text-xl font-bold tracking-tight text-charcoal">
            {BRAND_NAME}
          </span>
          <Heart size={11} className="-translate-y-1.5 fill-fucsia text-fucsia" aria-hidden />
        </Link>

        <nav className="flex items-center gap-1">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            const badgeCount = href === "/saved" ? productIds.length : 0;

            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13.5px] font-medium transition ${
                  active ? "bg-fucsia-light text-fucsia-dark" : "text-charcoal-soft hover:bg-charcoal/[0.04]"
                }`}
              >
                <Icon
                  size={16}
                  strokeWidth={active ? 2.5 : 2}
                  fill={active && href === "/saved" ? "currentColor" : "none"}
                />
                {label}
                {badgeCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-fucsia px-1 text-[9px] font-bold text-white">
                    {badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/search"
          aria-label={t.search.label}
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-charcoal hover:bg-charcoal/5"
        >
          <Search size={18} strokeWidth={2.2} />
        </Link>
      </div>
    </header>
  );
}
