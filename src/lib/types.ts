export type Category = "squishies" | "pets" | "home" | "tech" | "viral-china";

/** Marketing flair only. Availability (in stock / preorder / sold out) is a separate concern — see CustomerAvailability. */
export type BadgeType = "trending" | "new" | "just-dropped";

/**
 * Customer-facing availability state. This is what the storefront renders —
 * it is derived from, but never equal to, internal procurement/inventory
 * fields (see InternalProduct). Keeping them separate lets LUVI list and
 * sell products it hasn't purchased inventory for yet, without customers
 * ever seeing sourcing details.
 */
export type CustomerAvailability =
  | "IN_STOCK"
  | "PREORDER"
  | "SOLD_OUT_PREORDER"
  | "COMING_SOON"
  | "SOLD_OUT";

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
  description: string;
  shortDescription: string;
  /** Social proof counter shown as "N lo LUVI'd". */
  luviCount: number;
  createdAt: string;

  availability: CustomerAvailability;
  /** Human copy, e.g. "7–12 días hábiles" or "18–22 de agosto". Always a real promise, never fabricated. */
  deliveryEstimate?: string;
  /** Flavor label for a specific restock batch, e.g. "Restock #02". */
  restockBatchLabel?: string;
  /** Which drop this product ships with, if any. */
  dropId?: string;

  // --- Fields below are computed server-side from internal data (see
  // InternalProduct + toPublicProduct in queries.ts). Never author them
  // directly on a product record — they're outputs, not inputs.
  /** Only set when genuinely low (<=3) and IN_STOCK — "Solo quedan N 👀". */
  lowStockRemaining?: number;
  /** Real remaining reservation capacity for a preorder batch, when the batch is capped. */
  availableToReserve?: number;
}

/**
 * Internal procurement/inventory record. This is the shape LUVI's future
 * admin dashboard reads and writes. It must never be sent to the public
 * frontend/API as-is — queries.ts strips it down to a `Product` before
 * anything customer-facing touches it.
 */
export interface InternalProduct extends Product {
  localStockQuantity: number;
  reservedQuantity: number;
  incomingQuantity: number;

  supplierName?: string;
  supplierUrl?: string;
  supplierSku?: string;
  supplierCost?: number;
  supplierCurrency?: string;

  procurementLeadTimeDays?: number;
  internationalShippingEstimateDays?: number;
  /** Internal working ETA — may carry buffer vs. the public deliveryEstimate promise. */
  estimatedArrivalDateInternal?: string;

  /** Admin-only demand-validation counters (future dashboard: "47 people want this"). */
  interestCount: number;
  preorderCount: number;
}

export interface Drop {
  id: string;
  number: number;
  name: string;
  slug: string;
  /** Real ordering/preorder-consolidation deadline — countdowns must correspond to this. */
  closeDate: string;
  status: "active" | "upcoming" | "closed";
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

export const BADGE_META: Record<BadgeType, { label: string; className: string }> = {
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
};
