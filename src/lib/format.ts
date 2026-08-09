const groupFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

/** Formats a colones amount as "₡5,500" (comma thousands separator per LUVI style). */
export function formatCRC(amount: number): string {
  return `₡${groupFormatter.format(Math.round(amount))}`;
}
