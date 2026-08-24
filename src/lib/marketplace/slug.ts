/**
 * Human-readable, URL-safe slugs — sellers never see or choose one (Phase 8
 * Section 4: "Do NOT ask users to understand concepts like ... slug").
 * Lowercases, strips accents, replaces anything non-alphanumeric with a
 * single hyphen, trims leading/trailing hyphens, and falls back to a short
 * random id if the input had literally no usable characters (e.g. a store
 * name that's entirely emoji). Same accent-stripping approach as
 * search.ts's normalize().
 */
export function slugify(input: string): string {
  const base = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `tienda-${Math.random().toString(36).slice(2, 8)}`;
}
