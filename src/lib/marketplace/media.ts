/**
 * `Product.images[]` / `Merchant.logo` have always held short emoji
 * placeholder strings (mock/seed data) — Phase 8 is the first time a real
 * uploaded photo URL can land in either. Both are plain strings, so this
 * one check is what every component that renders an image/logo uses to
 * decide `<img>` vs. literal emoji text, rather than duplicating the same
 * `startsWith` check in five places.
 */
export function isPhotoUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}
