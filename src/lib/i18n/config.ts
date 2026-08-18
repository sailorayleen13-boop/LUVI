import type { CountryCode, CurrencyCode } from "@/lib/marketplace/types";

/**
 * Locale union grows as real locales are added — adding "en-US" here later
 * is a one-line change, not a restructure. No selector reads this yet;
 * everything just uses DEFAULT_LOCALE.
 */
export type Locale = "es-CR";

export const DEFAULT_LOCALE: Locale = "es-CR";

// Country/currency are data-model concerns (see marketplace/types.ts) —
// re-exported here as the app-wide defaults so components have one place
// to import "the current default" from instead of writing "CR"/"CRC" inline.
export const DEFAULT_COUNTRY: CountryCode = "CR";
export const DEFAULT_CURRENCY: CurrencyCode = "CRC";
