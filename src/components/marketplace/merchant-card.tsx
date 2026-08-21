import Link from "next/link";
import type { Merchant } from "@/lib/marketplace/types";

export function MerchantCard({ merchant }: { merchant: Merchant }) {
  return (
    <Link
      href={`/m/${merchant.slug}`}
      className="flex w-32 flex-none flex-col items-center gap-1.5 rounded-2xl border border-charcoal/8 p-3 text-center transition-colors hover:bg-charcoal/[0.03] active:bg-charcoal/[0.03]"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cream-soft text-2xl" aria-hidden>
        {merchant.logo}
      </span>
      <p className="line-clamp-1 text-[12.5px] font-semibold text-charcoal">{merchant.name}</p>
      <p className="line-clamp-1 text-[11px] text-charcoal-faint">{merchant.location.city}</p>
    </Link>
  );
}
