import type { Product } from "@/lib/marketplace/types";
import type { TastePreference } from "@/lib/marketplace/taste/types";

/**
 * Recommendation Engine V1 — deterministic, no ML/embeddings/LLM. A clean
 * boundary on purpose: everything here is a pure function over plain data
 * (products + taste signals + trending scores in, a ranked Product[] out),
 * so a future, smarter engine can replace this file's internals without
 * touching a single caller, exactly like queries.ts's mock-vs-Supabase
 * swap principle. Independently testable — no React, no Supabase client,
 * no fetch — see the smoke test referenced in the Phase 7 completion report.
 */

export interface RecommendationWeights {
  /** Share of the final list drawn from known-affinity candidates. */
  affinityRatio: number;
  /** Share drawn from trending/related candidates outside the affinity set. */
  trendingRatio: number;
  /** Share drawn from outside both — controlled serendipity, never a filter bubble. */
  explorationRatio: number;
}

/**
 * Starting weights, not immutable business rules (Phase 7 Section 11) —
 * approximately 70% known affinity / 20% trending / 10% exploration.
 * Callers may override any subset via recommendProductsForUser's options.
 */
export const DEFAULT_RECOMMENDATION_WEIGHTS: RecommendationWeights = {
  affinityRatio: 0.7,
  trendingRatio: 0.2,
  explorationRatio: 0.1,
};

const FRESHNESS_HALF_LIFE_MS = 21 * 24 * 60 * 60 * 1000; // 21 days
// Cap how much of the final list can share one category/merchant, so a
// single strong signal ("you like squishies") can't fill the whole feed.
const MAX_SHARE_PER_CATEGORY = 0.4;
const MAX_SHARE_PER_MERCHANT = 0.34;

interface ScoredProduct {
  product: Product;
  affinity: number;
  trending: number;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function freshnessScore(product: Product, now: number): number {
  const ageMs = Math.max(0, now - new Date(product.createdAt).getTime());
  return Math.pow(0.5, ageMs / FRESHNESS_HALF_LIFE_MS);
}

/**
 * Sum of matching taste_preferences weight (explicit + inferred combined)
 * for a product, across all four dimensions. Category/merchant contribute
 * at most once each (a product has exactly one of both); interest/
 * aesthetic can each contribute several times — a product tagged with two
 * of the user's liked interests scores higher than one tagged with only
 * one, which is the intended behavior (more genuine overlap = more
 * relevant), not double-counting.
 */
function affinityScore(
  product: Product,
  byCategory: Map<string, number>,
  byMerchant: Map<string, number>,
  byInterest: Map<string, number>,
  byAesthetic: Map<string, number>,
): number {
  let score = (byCategory.get(product.category) ?? 0) + (byMerchant.get(product.merchantId) ?? 0);
  for (const interest of product.interests) score += byInterest.get(interest) ?? 0;
  for (const aesthetic of product.aesthetics) score += byAesthetic.get(aesthetic) ?? 0;
  return score;
}

/**
 * Greedy diversity pass: walks candidates in priority order, skipping ones
 * that would push a category/merchant over its share cap, deferring them
 * to a second, relaxed pass so a small catalog never comes up short of
 * `limit` just because the strict caps couldn't be satisfied.
 */
function pickWithDiversity(candidates: Product[], limit: number): Product[] {
  const maxPerCategory = Math.max(1, Math.ceil(limit * MAX_SHARE_PER_CATEGORY));
  const maxPerMerchant = Math.max(1, Math.ceil(limit * MAX_SHARE_PER_MERCHANT));

  const picked: Product[] = [];
  const deferred: Product[] = [];
  const categoryCounts = new Map<string, number>();
  const merchantCounts = new Map<string, number>();
  const usedIds = new Set<string>();

  for (const product of candidates) {
    if (picked.length >= limit) break;
    if (usedIds.has(product.id)) continue;
    const catCount = categoryCounts.get(product.category) ?? 0;
    const merchCount = merchantCounts.get(product.merchantId) ?? 0;
    if (catCount >= maxPerCategory || merchCount >= maxPerMerchant) {
      deferred.push(product);
      continue;
    }
    picked.push(product);
    usedIds.add(product.id);
    categoryCounts.set(product.category, catCount + 1);
    merchantCounts.set(product.merchantId, merchCount + 1);
  }

  for (const product of deferred) {
    if (picked.length >= limit) break;
    if (usedIds.has(product.id)) continue;
    picked.push(product);
    usedIds.add(product.id);
  }

  return picked;
}

export interface RecommendProductsForUserInput {
  /** Public products already eligible for display (see toPublicProduct's allowlist). */
  products: Product[];
  tastePreferences: TastePreference[];
  /** Same shape trending.ts's computeTrendingScores() returns — reused, not recomputed. */
  trendingScores: Map<string, number>;
  limit?: number;
  weights?: RecommendationWeights;
  now?: number;
}

/**
 * V1 ranking: blends explicit + inferred taste-preference affinity,
 * trending score, and freshness into three prioritized candidate pools
 * (affinity / trending / exploration), allocates slots by
 * `weights` ratios, then re-ranks the combined list for category/merchant
 * diversity. SOLD_OUT products are excluded — recommending something
 * unbuyable isn't useful discovery.
 *
 * Cold-start (no taste signals at all) degrades gracefully: the affinity
 * pool is simply empty, so trending + exploration naturally fill the
 * whole list — callers don't need a separate code path (see
 * src/app/page.tsx, which still falls back to the existing discovery
 * sections when this returns too few results to bother showing).
 *
 * The SAME degradation covers a user who picked an interest/aesthetic with
 * zero matching products today (e.g. "fitness", "luxury" — nothing in the
 * V1 seed matches either): affinityScore() just never finds a product
 * carrying that tag, so that preference contributes nothing to the
 * affinity pool, and the list is filled by trending/exploration instead —
 * no special-case branch needed, no empty feed, no penalty for having
 * picked something LUVI doesn't carry yet.
 */
export function recommendProductsForUser({
  products,
  tastePreferences,
  trendingScores,
  limit = 12,
  weights = DEFAULT_RECOMMENDATION_WEIGHTS,
  now = Date.now(),
}: RecommendProductsForUserInput): Product[] {
  const eligible = products.filter((p) => p.availability !== "SOLD_OUT");
  if (eligible.length === 0) return [];

  const byCategory = new Map<string, number>();
  const byMerchant = new Map<string, number>();
  const byInterest = new Map<string, number>();
  const byAesthetic = new Map<string, number>();
  for (const pref of tastePreferences) {
    const target =
      pref.dimension === "category"
        ? byCategory
        : pref.dimension === "merchant"
          ? byMerchant
          : pref.dimension === "interest"
            ? byInterest
            : pref.dimension === "aesthetic"
              ? byAesthetic
              : null;
    if (!target) continue; // unknown dimension — ignore rather than throw, forward-compatible
    target.set(pref.value, (target.get(pref.value) ?? 0) + pref.weight);
  }

  const scored: ScoredProduct[] = eligible.map((product) => ({
    product,
    affinity:
      affinityScore(product, byCategory, byMerchant, byInterest, byAesthetic) *
      (0.6 + 0.4 * freshnessScore(product, now)),
    trending: trendingScores.get(product.id) ?? 0,
  }));

  const affinityPool = scored
    .filter((s) => s.affinity > 0)
    .sort((a, b) => b.affinity - a.affinity)
    .map((s) => s.product);
  const affinityIds = new Set(affinityPool.map((p) => p.id));

  const trendingPool = scored
    .filter((s) => !affinityIds.has(s.product.id) && s.trending > 0)
    .sort((a, b) => b.trending - a.trending)
    .map((s) => s.product);
  const trendingIds = new Set(trendingPool.map((p) => p.id));

  // Deterministic (hash-based, never Math.random() — matches the mock
  // seed-data convention elsewhere in this codebase) rather than a fixed
  // "everything else in catalog order" tail, so exploration actually
  // surfaces variety instead of always the same few unscored products.
  const explorationPool = scored
    .filter((s) => !affinityIds.has(s.product.id) && !trendingIds.has(s.product.id))
    .map((s) => s.product)
    .sort((a, b) => hashString(a.id) - hashString(b.id));

  const affinityCount = Math.round(limit * weights.affinityRatio);
  const trendingCount = Math.round(limit * weights.trendingRatio);
  const explorationCount = Math.max(0, limit - affinityCount - trendingCount);

  const candidates = [
    ...affinityPool.slice(0, affinityCount),
    ...trendingPool.slice(0, trendingCount),
    ...explorationPool.slice(0, explorationCount),
    // Backfill from whatever's left, in the same priority order, in case
    // any pool above was smaller than its slot allocation (small catalog,
    // thin signals) — pickWithDiversity below still enforces `limit`.
    ...affinityPool,
    ...trendingPool,
    ...explorationPool,
  ];

  return pickWithDiversity(candidates, Math.min(limit, eligible.length));
}
