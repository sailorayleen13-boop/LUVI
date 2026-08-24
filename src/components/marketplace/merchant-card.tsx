import Link from "next/link";
import type { Merchant } from "@/lib/marketplace/types";
import { MerchantLogo } from "@/components/marketplace/merchant-logo";

export function MerchantCard({ merchant }: { merchant: Merchant }) {
  return (
    <Link
      href={`/m/${merchant.slug}`}
      className="flex w-32 flex-none flex-col items-center gap-1.5 rounded-2xl border border-charcoal/8 p-3 text-center transition-colors hover:bg-charcoal/[0.03] active:bg-charcoal/[0.03]"
    >
      <MerchantLogo logo={merchant.logo} className="h-12 w-12 text-2xl" />
      <p className="line-clamp-1 text-[12.5px] font-semibold text-charcoal">{merchant.name}</p>
      <p className="line-clamp-1 text-[11px] text-charcoal-faint">{merchant.location.city}</p>
    </Link>
  );
}
