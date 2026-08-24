import type { Category } from "@/lib/marketplace/types";

/**
 * Emoji for the category picker's visual tiles (components/merchant/
 * category-picker.tsx) — same "presentation concern, not the data model"
 * rule as product-image.tsx's CATEGORY_GRADIENT (which this pairs with:
 * the picker tile for each category uses that exact gradient + this emoji,
 * so a category reads identically in the picker and on the resulting
 * product card).
 */
export const CATEGORY_EMOJI: Record<Category, string> = {
  squishies: "🧸",
  collectibles: "🎁",
  pets: "🐾",
  beauty: "💄",
  fashion: "👜",
  home: "🏠",
  tech: "🖥️",
  gifts: "💝",
  viral: "🌀",
};
