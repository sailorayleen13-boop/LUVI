import { CATEGORY_STYLE, type Category } from "@/lib/types";

/**
 * Placeholder product visual: an emoji on a soft category-tinted gradient.
 * `images[0]` today holds an emoji; once real photos exist, swap this for
 * an <Image> when the string looks like a URL.
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
  /** Dims the image for genuinely unavailable states (SOLD_OUT / SOLD_OUT_PREORDER). */
  faded?: boolean;
}) {
  const { gradient } = CATEGORY_STYLE[category];

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} ${className}`}
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
