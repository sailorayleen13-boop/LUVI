import { BADGE_META, type BadgeType } from "@/lib/types";

export function BadgePill({ type }: { type: BadgeType }) {
  const meta = BADGE_META[type];
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}
