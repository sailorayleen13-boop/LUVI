import { esCR } from "@/lib/i18n/dictionaries/es-CR";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

/**
 * One dictionary object per locale. Adding a locale later is adding a key
 * here (`"en-US": enUS`) plus a way to choose it — neither exists yet on
 * purpose (no selector, no English copy per this phase's scope).
 */
const dictionaries = {
  "es-CR": esCR,
} satisfies Record<Locale, typeof esCR>;

/**
 * The active dictionary. Components do `t.product.relatedHeading` instead
 * of writing Spanish inline — this gives full TypeScript autocomplete/
 * type-checking on keys with no runtime string lookup, and the only thing
 * that changes when locale selection is introduced is what `t` resolves to.
 */
export const t = dictionaries[DEFAULT_LOCALE];

export * from "@/lib/i18n/config";
