import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Merchant } from "@/lib/marketplace/types";
import { t } from "@/lib/i18n";

function formatLocation(merchant: Merchant): string {
  const { city, region } = merchant.location;
  return [city, region].filter(Boolean).join(", ");
}

export function MerchantBlock({ merchant }: { merchant: Merchant }) {
  return (
    <Link
      href={`/m/${merchant.slug}`}
      className="flex items-center gap-3 rounded-2xl border border-charcoal/8 p-3.5 transition-colors hover:bg-charcoal/[0.03] active:bg-charcoal/[0.03]"
    >
      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-cream-soft text-xl" aria-hidden>
        {merchant.logo}
      </span>
      <div className="flex-1">
        <p className="text-[13.5px] font-semibold text-charcoal">{merchant.name}</p>
        <p className="text-[12px] text-charcoal-faint">{formatLocation(merchant)}</p>
      </div>
      <span className="flex items-center gap-0.5 text-[12.5px] font-semibold text-fucsia-dark">
        {t.merchant.viewStore}
        <ChevronRight size={14} />
      </span>
    </Link>
  );
}
