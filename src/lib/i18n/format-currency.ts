import type { CurrencyCode } from "@/lib/marketplace/types";
import { DEFAULT_CURRENCY } from "@/lib/i18n/config";

const groupFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

// Extend as new currencies launch. Deliberately a lookup table, not an
// if/else, so adding "USD" later doesn't touch call sites.
const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  CRC: "₡",
};

/**
 * Formats an amount as "₡3.800" — period thousands separator, matching
 * everyday es-CR commercial convention (this differs from both the formal
 * es-CR ICU locale data, which groups with a space, and the ecommerce
 * MVP's earlier comma choice in src/lib/format.ts, which this
 * intentionally does not touch).
 */
export function formatCurrency(amount: number, currency: CurrencyCode = DEFAULT_CURRENCY): string {
  const grouped = groupFormatter.format(Math.round(amount)).replace(/,/g, ".");
  return `${CURRENCY_SYMBOLS[currency]}${grouped}`;
}
