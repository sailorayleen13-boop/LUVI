/**
 * Application-level constraint on top of taste_preferences' deliberately
 * generic `dimension text` / `value text` columns (see
 * supabase/migrations/0003_taste_profile.sql) — the DB stays extensible
 * without a migration for a new dimension; this union is what actually
 * limits it today. Add a new dimension here (e.g. "price_tendency") when
 * something in the app is ready to read/write it, not before.
 *
 * "interest" and "aesthetic" are the two EXPLICIT dimensions onboarding and
 * Account's "Tus gustos" collect (see lib/marketplace/types.ts's
 * INTEREST_VALUES/AESTHETIC_VALUES for the actual vocabulary — kept there,
 * not here, since it's product-catalog vocabulary a Product also carries).
 * "category" and "merchant" are now INFERRED-only signals, learned from
 * behavior (recordAuthenticatedInteractionAction) rather than picked in the
 * UI — see the Phase 7 Taste Profile completion report's "explicit vs
 * inferred" section for why: interest/aesthetic describe what someone
 * wants even for products LUVI doesn't carry yet, which category/merchant
 * (both scoped to the existing catalog) can't.
 */
export type TasteDimension = "category" | "merchant" | "interest" | "aesthetic";

export type PreferenceSource = "explicit" | "inferred";

export interface TastePreference {
  dimension: TasteDimension;
  /** A Category slug for "category", a merchant id for "merchant". */
  value: string;
  weight: number;
  source: PreferenceSource;
}
