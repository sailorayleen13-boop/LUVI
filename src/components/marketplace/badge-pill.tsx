import type { BadgeType } from "@/lib/marketplace/types";

const BADGE_STYLE: Record<BadgeType, { label: string; className: string }> = {
  trending: { label: "Trending", className: "bg-charcoal text-cream" },
  new: { label: "New", className: "bg-fucsia text-white" },
};

export function BadgePill({ type }: { type: BadgeType }) {
  const meta = BADGE_STYLE[type];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide ${meta.className}`}>
      {meta.label}
    </span>
  );
}
