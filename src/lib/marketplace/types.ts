/**
 * Marketplace data model (v1).
 *
 * LUVI does not own inventory. Merchants list products; LUVI is a discovery
 * layer that sends customers to the merchant to complete the purchase.
 *
 * This module is additive and currently unused by the live app — see
 * MARKETPLACE_MIGRATION.md for why it lives alongside (not inside) the
 * existing src/lib/*.ts files during Phase 1.
 */

// ---------------------------------------------------------------------------
// Locale / region — CR-only today, but nothing below hardcodes that beyond
// these two union types. Adding a country/currency later is adding a member
// to a union, not restructuring a model.
// ---------------------------------------------------------------------------

export type CountryCode = "CR";
export type CurrencyCode = "CRC";

export interface Location {
  country: CountryCode;
  /** Province/state, e.g. "San José". */
  region?: string;
  city?: string;
  addressOptional?: string;
}

// ---------------------------------------------------------------------------
// Category — expanded beyond the original squishies-first slice to match
// the categories the product brief calls out. Not all of these have mock
// products yet (see mock/products.ts); the union exists so merchants can
// list into them without a type change later.
// ---------------------------------------------------------------------------

export type Category =
  | "squishies"
  | "collectibles"
  | "pets"
  | "beauty"
  | "fashion"
  | "home"
  | "tech"
  | "gifts"
  | "viral";

export type BadgeType = "trending" | "new";

// ---------------------------------------------------------------------------
// Taste Profile vocabulary — "what kind of thing" (Interest) and "how it
// looks/feels" (Aesthetic), kept as two SEPARATE dimensions on purpose: a
// user who likes "home" + "minimal" is a different shopper from one who
// likes "home" + "colorful" (Phase 7 Taste Profile V1 Section 2). Both live
// here next to Category because the same rule applies — stable,
// machine-readable identifiers; a new value is an addition to this array,
// not a migration (product_interests/product_aesthetics.interest/aesthetic
// are plain `text` columns, not Postgres enums, for exactly this reason —
// see 0003_taste_profile.sql). Some values may have zero matching products
// today (see mock/products.ts's tagging) — that's expected, not a bug: the
// Taste Profile represents what a user likes even when the catalog hasn't
// caught up yet (see recommendations.ts's graceful zero-match backfill).
// Visible labels always come from the es-CR dictionary (t.interest.*,
// t.aesthetic.*), never hardcoded near these identifiers.
// ---------------------------------------------------------------------------

export const INTEREST_VALUES = [
  "fashion",
  "beauty",
  "skincare",
  "home",
  "kawaii",
  "tech",
  "pets",
  "fitness",
  "gaming",
  "accessories",
  "food",
  "travel",
] as const;
export type Interest = (typeof INTEREST_VALUES)[number];

export const AESTHETIC_VALUES = [
  "minimal",
  "cute",
  "luxury",
  "colorful",
  "trendy",
  "cozy",
  "clean",
  "girly",
  "streetwear",
] as const;
export type Aesthetic = (typeof AESTHETIC_VALUES)[number];

// Presentation concerns (label strings, gradients, badge styling) are
// deliberately NOT in this file. Phase 1 is data architecture only; label
// tables move to the UI layer in Phase 2, and their copy should come from
// the es-CR dictionary rather than being hardcoded here.

// ---------------------------------------------------------------------------
// Merchant
// ---------------------------------------------------------------------------

export type MerchantStatus = "active" | "paused";

export interface Merchant {
  id: string;
  slug: string;
  name: string;
  /** Emoji placeholder today, same convention as ProductImage; swap for a real logo URL later. */
  logo: string;
  description: string;
  location: Location;
  website?: string;
  whatsapp?: string;
  instagram?: string;
  status: MerchantStatus;
  createdAt: string;
}

/**
 * Internal merchant record — what a future merchant dashboard reads/writes.
 * Never sent to the public frontend/API as-is; toPublicMerchant() in
 * queries.ts strips it down to a Merchant first. Mirrors the
 * InternalProduct/Product split already used for the ecommerce MVP.
 */
export interface InternalMerchant extends Merchant {
  contactEmail?: string;
  moderationStatus: "pending" | "approved" | "rejected";
  /** Aggregate analytics cache — computed from ProductInteraction events, not authored by hand. */
  viewCount: number;
  clickOutCount: number;
  // Explicitly NOT modeled yet: auth/account fields, payouts, commission
  // rate, billing. Those arrive with real merchant auth in a later phase.
}

// ---------------------------------------------------------------------------
// Product availability — merchant-controlled, not LUVI-controlled. No more
// SOLD_OUT_PREORDER / restock-batch semantics: those modeled LUVI running
// its own procurement drops, which no longer happens. A merchant just states
// which of these four applies; LUVI doesn't infer or override it.
// ---------------------------------------------------------------------------

export type MerchantAvailability = "IN_STOCK" | "PREORDER" | "COMING_SOON" | "SOLD_OUT";

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

export interface Product {
  id: string;
  merchantId: string;
  slug: string;
  name: string;
  description: string;
  shortDescription: string;
  category: Category;
  price: number;
  currency: CurrencyCode;
  /** Emoji placeholder today; swap for real photo URLs later. */
  images: string[];
  badges: BadgeType[];
  /** Which Interests this product satisfies — may be empty; never fabricated just to cover every value. */
  interests: Interest[];
  /** Which Aesthetics this product fits — may be empty. */
  aesthetics: Aesthetic[];
  availability: MerchantAvailability;
  /** Merchant-provided copy, relevant for PREORDER, e.g. "7–12 días hábiles". */
  deliveryEstimate?: string;
  /** Product-specific purchase link; falls back to the merchant's general links when unset. */
  externalPurchaseUrl?: string;
  whatsappUrl?: string;
  instagramUrl?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Internal product record. Same boundary rule as InternalMerchant: this
 * never reaches the storefront directly. toPublicProduct() in queries.ts
 * maps it down to a Product via an explicit allowlist.
 */
export interface InternalProduct extends Product {
  moderationStatus: "pending" | "approved" | "rejected";
  viewCount: number;
  saveCount: number;
  clickOutCount: number;
  /**
   * Deterministic mock seed for "Trending Near You" ordering only. This is
   * NOT a scoring algorithm — once real usage exists, getTrending() should
   * rank by aggregated ProductInteraction events (views/saves/clicks,
   * recency-weighted, filtered by location) instead of this field. Kept
   * internal so a future real score can't be confused with merchant input.
   */
  seedPopularity: number;
  /**
   * Deterministic mock seed for "Los más LUVI'd" ordering only — same
   * caveat as seedPopularity. Stands in for a future real save/love-based
   * signal (e.g. aggregated "save" ProductInteraction events), kept as a
   * separate field so Trending and Most LUVI'd can actually differ in mock
   * mode instead of both reading the same number.
   */
  seedLuviCount: number;
}

// ---------------------------------------------------------------------------
// Drop — editorial/discovery collections. No longer a LUVI-owned inventory
// drop with an ordering deadline: a Drop is just a curated set of products
// that can span many independent merchants (e.g. "Squishy Obsession",
// "Trending TikTok Finds"). Purely a merchandising/discovery surface.
// ---------------------------------------------------------------------------

export type DropStatus = "active" | "scheduled" | "archived";

export interface Drop {
  id: string;
  slug: string;
  name: string;
  description?: string;
  /** Emoji placeholder, same convention as ProductImage. */
  coverEmoji: string;
  /** Product ids curated into this collection; may span multiple merchants. */
  productIds: string[];
  status: DropStatus;
  publishedAt: string;
}

// ---------------------------------------------------------------------------
// ProductInteraction — the one event shape behind every future analytics
// need called out in the audit: views, searches, saves, LUVI IT clickouts,
// store views, and repurposed "I NEED THIS" interest signals. In mock mode
// these are recorded locally (see interactions.ts); once Supabase exists,
// this same shape becomes an insert into an events table, and
// getTrending()/merchant performance/demand-insights all read from it
// instead of hand-authored numbers.
// ---------------------------------------------------------------------------

export type InteractionType =
  | "product_view"
  | "search"
  | "save"
  | "unsave"
  | "luvi_it_click"
  | "store_view"
  | "interest";

export interface ProductInteraction {
  id: string;
  type: InteractionType;
  /** Set for product_view / save / unsave / luvi_it_click, and optionally for interest. */
  productId?: string;
  /** Set for store_view, and denormalized onto product-scoped events for convenience. */
  merchantId?: string;
  /** Set for search, and optionally for interest (category-level unmet demand). */
  category?: Category;
  /** Free-text search term, or the term behind an "interest" signal with no product match. */
  query?: string;
  location?: Location;
  createdAt: string;
}
