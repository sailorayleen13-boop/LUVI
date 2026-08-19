/**
 * Application-level constraint on top of taste_preferences' deliberately
 * generic `dimension text` / `value text` columns (see
 * supabase/migrations/0003_taste_profile.sql) — the DB stays extensible
 * without a migration for a new dimension; this union is what actually
 * limits it today. Add a new dimension here (e.g. "price_tendency") when
 * something in the app is ready to read/write it, not before.
 */
export type TasteDimension = "category" | "merchant";

export type PreferenceSource = "explicit" | "inferred";

export interface TastePreference {
  dimension: TasteDimension;
  /** A Category slug for "category", a merchant id for "merchant". */
  value: string;
  weight: number;
  source: PreferenceSource;
}
