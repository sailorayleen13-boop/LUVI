import type { MerchantAvailability } from "@/lib/marketplace/types";
import { t } from "@/lib/i18n";

const AVAILABILITY_STYLE: Record<MerchantAvailability, string> = {
  IN_STOCK: "bg-emerald-100 text-emerald-800",
  PREORDER: "bg-fucsia-light text-fucsia-dark",
  COMING_SOON: "bg-violet-100 text-violet-800",
  SOLD_OUT: "bg-charcoal/10 text-charcoal-soft",
};

/** Only rendered for non-default states on compact surfaces (cards) — call sites decide when to hide it for IN_STOCK. */
export function AvailabilityBadge({ availability }: { availability: MerchantAvailability }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide ${AVAILABILITY_STYLE[availability]}`}
    >
      {t.availability[availability]}
    </span>
  );
}
