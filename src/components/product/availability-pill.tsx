import type { AvailabilityPresentation } from "@/lib/availability";

export function AvailabilityPill({
  presentation,
}: {
  presentation: AvailabilityPresentation;
}) {
  if (!presentation.showPill) return null;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide ${presentation.pillClassName}`}
    >
      {presentation.pillLabel}
    </span>
  );
}
