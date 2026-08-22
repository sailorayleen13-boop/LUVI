import type { Aesthetic, Interest } from "@/lib/marketplace/types";

/**
 * Presentation-only metadata for the onboarding/​"Tus gustos" preference
 * cards — deliberately kept out of lib/marketplace/types.ts, same rule
 * product-image.tsx's CATEGORY_GRADIENT already follows for Category (the
 * data model shouldn't know about gradients/emoji). No external image
 * generation and no scraped photography per this phase's scope: each card
 * is an emoji over a tinted gradient, the same "placeholder visual, safe
 * to replace with real photography later" convention every ProductImage
 * already uses — replacing INTEREST_VISUALS/AESTHETIC_VISUALS with real
 * asset URLs later doesn't touch anything that reads Interest/Aesthetic
 * values themselves.
 */
export const INTEREST_VISUALS: Record<Interest, { emoji: string; gradient: string }> = {
  fashion: { emoji: "👗", gradient: "from-rose-100 to-pink-200" },
  beauty: { emoji: "💄", gradient: "from-fucsia-light to-pink-200" },
  skincare: { emoji: "🧴", gradient: "from-emerald-100 to-teal-100" },
  home: { emoji: "🏠", gradient: "from-violet-100 to-purple-200" },
  kawaii: { emoji: "🎀", gradient: "from-pink-100 to-fucsia-light" },
  tech: { emoji: "🖥️", gradient: "from-sky-100 to-blue-200" },
  pets: { emoji: "🐾", gradient: "from-amber-100 to-orange-200" },
  fitness: { emoji: "🏋️", gradient: "from-lime-100 to-emerald-200" },
  gaming: { emoji: "🎮", gradient: "from-indigo-100 to-violet-200" },
  accessories: { emoji: "👜", gradient: "from-slate-100 to-zinc-200" },
  food: { emoji: "🍓", gradient: "from-red-100 to-rose-200" },
  travel: { emoji: "✈️", gradient: "from-cyan-100 to-sky-200" },
};

export const AESTHETIC_VISUALS: Record<Aesthetic, { emoji: string; gradient: string }> = {
  minimal: { emoji: "◻️", gradient: "from-zinc-100 to-slate-200" },
  cute: { emoji: "🩷", gradient: "from-pink-100 to-fucsia-light" },
  luxury: { emoji: "✨", gradient: "from-amber-100 to-yellow-200" },
  colorful: { emoji: "🌈", gradient: "from-fuchsia-100 to-purple-200" },
  trendy: { emoji: "⚡", gradient: "from-violet-100 to-indigo-200" },
  cozy: { emoji: "🧸", gradient: "from-orange-100 to-amber-200" },
  clean: { emoji: "🤍", gradient: "from-slate-100 to-gray-200" },
  girly: { emoji: "🎀", gradient: "from-rose-100 to-pink-200" },
  streetwear: { emoji: "🧢", gradient: "from-neutral-200 to-zinc-300" },
};
