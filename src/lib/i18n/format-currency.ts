import type { CurrencyCode } from "@/lib/marketplace/types";
import { DEFAULT_CURRENCY } from "@/lib/i18n/config";

const groupFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

// Extend as new currencies launch. Deliberately a lookup table, not an
// if/else, so adding "USD" later doesn't touch call sites.
const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  CRC: "₡",
};

/** Formats an amount as "₡5,500" — comma grouping per LUVI's brand style, currency/locale parameterized. */
export function formatCurrency(amount: number, currency: CurrencyCode = DEFAULT_CURRENCY): string {
  return `${CURRENCY_SYMBOLS[currency]}${groupFormatter.format(Math.round(amount))}`;
}
