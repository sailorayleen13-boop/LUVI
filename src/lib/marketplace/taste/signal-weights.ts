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
 *
 * Category and merchant are both INFERRED-only dimensions as of the Taste
 * Profile product pass — see INTEREST_SIGNAL_WEIGHT/AESTHETIC_SIGNAL_WEIGHT
 * below for the two EXPLICIT dimensions' matching inferred-signal tiers.
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

/**
 * Interest gets the SAME tier as category, not a fraction of it: both
 * describe "what kind of thing" and are equally generalizable across the
 * catalog (Taste Profile Section 8) — a save on a kawaii-tagged product
 * should teach LUVI "this person likes kawaii" just as strongly as it
 * teaches "this person likes squishies". Applied once per interest tag the
 * interacted product carries (see recordAuthenticatedInteractionAction),
 * so a product with two interests reinforces both.
 */
export const INTEREST_SIGNAL_WEIGHT: Partial<Record<InteractionType, number>> = {
  luvi_it_click: 5,
  save: 3,
  product_view: 1,
  unsave: -3,
};

/**
 * Aesthetic gets the MERCHANT tier, not the category/interest tier — a
 * stylistic read on a single interaction is a narrower bet than a subject-
 * matter one (the same "this person is browsing squishies" view says much
 * less about their preferred aesthetic than it does about their interest),
 * so it moves weight more cautiously. Same delta-per-tag application as
 * INTEREST_SIGNAL_WEIGHT above.
 */
export const AESTHETIC_SIGNAL_WEIGHT: Partial<Record<InteractionType, number>> = {
  luvi_it_click: 3,
  save: 2,
  product_view: 0.5,
  unsave: -2,
};
