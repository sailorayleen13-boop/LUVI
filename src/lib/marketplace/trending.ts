import type { ProductInteraction } from "@/lib/marketplace/types";

export interface TrendingWeights {
  product_view: number;
  save: number;
  luvi_it_click: number;
}

const DEFAULT_WEIGHTS: TrendingWeights = { product_view: 1, save: 3, luvi_it_click: 5 };
const HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Recency-weighted trending score computed from ProductInteraction events —
 * a deterministic weighted sum with exponential decay, not ML and not
 * random. This is the function a future server-side aggregation job
 * replaces: callers pass whichever event list they have (today: a
 * deterministic mock seed; later: real events from Supabase) and get back
 * a stable Map<productId, score>. Same event list + same `now` always
 * produces the same ranking.
 */
export function computeTrendingScores(
  events: ProductInteraction[],
  now: number = Date.now(),
  weights: TrendingWeights = DEFAULT_WEIGHTS,
): Map<string, number> {
  const scores = new Map<string, number>();

  for (const event of events) {
    if (!event.productId) continue;
    const weight = weights[event.type as keyof TrendingWeights];
    if (!weight) continue;

    const ageMs = Math.max(0, now - new Date(event.createdAt).getTime());
    const decay = Math.pow(0.5, ageMs / HALF_LIFE_MS);
    scores.set(event.productId, (scores.get(event.productId) ?? 0) + weight * decay);
  }

  return scores;
}
