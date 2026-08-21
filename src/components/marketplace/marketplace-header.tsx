"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { t } from "@/lib/i18n";

/**
 * Back + title header for marketplace preview pages. Deliberately NOT the
 * ecommerce BackHeader (which shows a cart badge) — LUVI IT! no longer adds
 * to a cart, so a cart icon here would be actively wrong. Nav/header
 * consolidation happens in a later phase; this is scoped to marketplace
 * preview routes only.
 */
export function MarketplaceHeader({ title }: { title?: string }) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 bg-cream/95 px-2 pb-3 pt-[calc(14px+env(safe-area-inset-top))] backdrop-blur-sm lg:top-16">
      <button
        type="button"
        onClick={() => router.back()}
        aria-label={t.common.back}
        className="flex h-10 w-10 flex-none items-center justify-center rounded-full active:bg-charcoal/5"
      >
        <ChevronLeft size={24} className="text-charcoal" />
      </button>
      <p className="line-clamp-1 flex-1 text-center text-[15px] font-semibold text-charcoal">
        {title}
      </p>
      <span className="w-10 flex-none" aria-hidden />
    </header>
  );
}
