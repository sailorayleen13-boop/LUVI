import Link from "next/link";
import type { Drop } from "@/lib/marketplace/types";

/**
 * Editorial collection card — deliberately styled distinct from
 * ProductCard (dark charcoal instead of the pastel category gradients) so
 * a Drop reads as curated/editorial, not as a product. No countdown, no
 * scarcity language: Drops are a discovery surface, not LUVI-owned
 * inventory with a deadline.
 */
export function DropCard({ drop }: { drop: Drop }) {
  return (
    <Link
      href={`/drops/${drop.slug}`}
      className="flex w-60 flex-none flex-col gap-2 rounded-2xl bg-gradient-to-br from-charcoal to-charcoal-soft p-4 text-cream active:scale-[0.98]"
    >
      <span className="text-3xl" aria-hidden>
        {drop.coverEmoji}
      </span>
      <div>
        <p className="font-display text-[15px] font-bold leading-tight">{drop.name}</p>
        {drop.description && (
          <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-cream/70">
            {drop.description}
          </p>
        )}
      </div>
    </Link>
  );
}
