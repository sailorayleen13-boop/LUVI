import { products as internalProducts } from "@/lib/marketplace/mock/products";
import type { ProductInteraction } from "@/lib/marketplace/types";

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const SPREAD_DAYS = 14;

/** Deterministic "days ago" for a given event — hash-derived, not Math.random(), so it's identical on every run. */
function daysAgoFor(seed: string): number {
  return (hashString(seed) % SPREAD_DAYS) + 1;
}

function seedEvent(
  kind: string,
  index: number,
  type: ProductInteraction["type"],
  product: (typeof internalProducts)[number],
): ProductInteraction {
  return {
    id: `seed_${kind}_${product.id}_${index}`,
    type,
    productId: product.id,
    merchantId: product.merchantId,
    category: product.category,
    createdAt: new Date(Date.now() - daysAgoFor(`${product.id}-${kind}-${index}`) * DAY_MS).toISOString(),
  };
}

/**
 * Deterministic seed interaction events — stands in for real aggregated
 * usage until Supabase exists. Event counts are derived from each mock
 * product's existing seedPopularity/seedLuviCount (Phase 2), so there's one
 * source of truth for "how popular is this mock product," just expressed
 * as event-shaped data instead of a bare number. Ages are hash-derived
 * from productId (never Math.random()), so computeTrendingScores() over
 * this list produces the same ranking on every render/refresh/build.
 */
export const interactions: ProductInteraction[] = internalProducts.flatMap((product) => {
  const viewCount = Math.max(1, Math.round(product.seedPopularity / 150));
  const saveCount = Math.round(product.seedLuviCount / 250);
  const clickCount = Math.round(product.seedPopularity / 400);

  return [
    ...Array.from({ length: viewCount }, (_, i) => seedEvent("view", i, "product_view", product)),
    ...Array.from({ length: saveCount }, (_, i) => seedEvent("save", i, "save", product)),
    ...Array.from({ length: clickCount }, (_, i) => seedEvent("click", i, "luvi_it_click", product)),
  ];
});
