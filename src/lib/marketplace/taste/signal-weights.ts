import type { InteractionType } from "@/lib/marketplace/types";

/**
 * Interaction-type → taste-preference weight delta (Phase 7 Section 9's
 * strength tiers): strong positive (luvi_it_click, save), medium positive
 * (product_view), explicit negative (unsave). Category gets the full
 * delta; merchant gets a smaller fraction of it — category is the more
 * generalizable signal ("you like squishies" transfers across merchants;
 * "you liked this one merchant" is a narrower bet). Event types with no
 * entry here (search, store_view, interest) don't move taste weight in V1
 * — they're recorded in product_interactions regardless, available to a
 * future, more sophisticated pass without a schema change.
 */
export const CATEGORY_SIGNAL_WEIGHT: Partial<Record<InteractionType, number>> = {
  luvi_it_click: 5,
  save: 3,
  product_view: 1,
  unsave: -3,
};

export const MERCHANT_SIGNAL_WEIGHT: Partial<Record<InteractionType, number>> = {
  luvi_it_click: 3,
  save: 2,
  product_view: 0.5,
  unsave: -2,
};
