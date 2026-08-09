export type Category = "squishies" | "pets" | "home" | "tech" | "viral-china";

export type BadgeType =
  | "trending"
  | "new"
  | "just-dropped"
  | "low-stock"
  | "sold-out";

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: Category;
  price: number;
  compareAtPrice?: number;
  /** Emoji placeholder for now; swap for real photo URLs later. */
  images: string[];
  badges: BadgeType[];
  stock: number;
  description: string;
  shortDescription: string;
  /** Social proof counter shown as "N lo LUVI'd". */
  luviCount: number;
  createdAt: string;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  squishies: "Squishies",
  pets: "Pet Finds",
  home: "Cute Finds",
  tech: "Tech & Desk",
  "viral-china": "Viral Finds",
};

export const CATEGORY_STYLE: Record<Category, { gradient: string }> = {
  squishies: { gradient: "from-fucsia-light to-pink-200" },
  pets: { gradient: "from-amber-100 to-orange-200" },
  home: { gradient: "from-violet-100 to-purple-200" },
  tech: { gradient: "from-sky-100 to-blue-200" },
  "viral-china": { gradient: "from-emerald-100 to-teal-200" },
};

export const BADGE_META: Record<
  BadgeType,
  { label: string; className: string }
> = {
  trending: {
    label: "Trending",
    className: "bg-charcoal text-cream",
  },
  new: {
    label: "New",
    className: "bg-fucsia text-white",
  },
  "just-dropped": {
    label: "Just dropped",
    className: "bg-fucsia-light text-fucsia-dark",
  },
  "low-stock": {
    label: "Últimas unidades",
    className: "bg-amber-100 text-amber-800",
  },
  "sold-out": {
    label: "Agotado",
    className: "bg-charcoal/10 text-charcoal-soft",
  },
};
