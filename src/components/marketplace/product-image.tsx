import type { Category } from "@/lib/marketplace/types";

/**
 * Category gradient map for the marketplace's 9 categories (vs. the
 * ecommerce MVP's 5) — presentation concern, deliberately kept out of
 * lib/marketplace/types.ts per the Phase 1 note.
 */
const CATEGORY_GRADIENT: Record<Category, string> = {
  squishies: "from-fucsia-light to-pink-200",
  collectibles: "from-indigo-100 to-violet-200",
  pets: "from-amber-100 to-orange-200",
  beauty: "from-rose-100 to-pink-200",
  fashion: "from-slate-100 to-zinc-200",
  home: "from-violet-100 to-purple-200",
  tech: "from-sky-100 to-blue-200",
  gifts: "from-red-100 to-rose-200",
  viral: "from-emerald-100 to-teal-200",
};

/** Placeholder product visual: an emoji on a category-tinted gradient. Same convention as the ecommerce MVP's ProductImage. */
export function ProductImage({
  emoji,
  category,
  className = "",
  faded = false,
}: {
  emoji: string;
  category: Category;
  className?: string;
  faded?: boolean;
}) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${CATEGORY_GRADIENT[category]} ${className}`}
    >
      <span
        className="select-none text-5xl leading-none"
        style={{ filter: faded ? "grayscale(1)" : undefined }}
        aria-hidden
      >
        {emoji}
      </span>
      {faded && <div className="absolute inset-0 bg-white/50" />}
    </div>
  );
}
