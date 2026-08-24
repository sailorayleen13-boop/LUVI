import type { Category } from "@/lib/marketplace/types";
import { isPhotoUrl } from "@/lib/marketplace/media";

/**
 * Category gradient map for the marketplace's 9 categories (vs. the
 * ecommerce MVP's 5) — presentation concern, deliberately kept out of
 * lib/marketplace/types.ts per the Phase 1 note. Exported so the Phase 8
 * category picker (components/merchant/category-picker.tsx) uses the exact
 * same tiles a product card will render, not a second hand-kept palette.
 */
export const CATEGORY_GRADIENT: Record<Category, string> = {
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

/**
 * Product visual — either a real merchant-uploaded photo (Phase 8: a
 * Supabase Storage public URL) or the emoji-on-gradient placeholder every
 * mock/seeded product still uses. `emoji` carries both shapes (see
 * lib/marketplace/media.ts's isPhotoUrl docstring for why one string field
 * covers both) — plain `<img>`, not next/image, since the Supabase project
 * host is per-deployment/env-configured rather than fixed at build time.
 */
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
  const photo = isPhotoUrl(emoji);

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-2xl ${
        photo ? "bg-cream-soft" : `bg-gradient-to-br ${CATEGORY_GRADIENT[category]}`
      } ${className}`}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={emoji}
          alt=""
          className={`h-full w-full object-cover ${faded ? "grayscale opacity-60" : ""}`}
        />
      ) : (
        <span
          className="select-none text-5xl leading-none"
          style={{ filter: faded ? "grayscale(1)" : undefined }}
          aria-hidden
        >
          {emoji}
        </span>
      )}
      {faded && !photo && <div className="absolute inset-0 bg-white/50" />}
    </div>
  );
}
