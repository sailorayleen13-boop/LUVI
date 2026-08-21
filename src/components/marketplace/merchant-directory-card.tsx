import Link from "next/link";
import type { Merchant } from "@/lib/marketplace/types";
import { t } from "@/lib/i18n";

export function MerchantDirectoryCard({
  merchant,
  productCount,
}: {
  merchant: Merchant;
  productCount: number;
}) {
  const location = [merchant.location.city, merchant.location.region].filter(Boolean).join(", ");

  return (
    <Link
      href={`/m/${merchant.slug}`}
      className="flex gap-3 rounded-2xl border border-charcoal/8 p-3.5 transition-colors hover:bg-charcoal/[0.03] active:bg-charcoal/[0.03]"
    >
      <span
        className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-cream-soft text-2xl"
        aria-hidden
      >
        {merchant.logo}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-charcoal">{merchant.name}</p>
        <p className="text-[12px] text-charcoal-faint">{location}</p>
        {merchant.description && (
          <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-charcoal-soft">
            {merchant.description}
          </p>
        )}
        <p className="mt-1 text-[11.5px] font-medium text-fucsia-dark">
          {productCount} {t.merchant.productCountSuffix}
        </p>
      </div>
    </Link>
  );
}
