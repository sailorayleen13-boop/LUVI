import "server-only";
import { getCurrentUser } from "@/lib/auth/session";
import { getTastePreferences } from "@/lib/marketplace/taste/queries";
import { getAllProducts, getRecentInteractions } from "@/lib/marketplace/catalog";
import { computeTrendingScores } from "@/lib/marketplace/trending";
import { recommendProductsForUser } from "@/lib/marketplace/recommendations";
import type { Product } from "@/lib/marketplace/types";

export interface PersonalizedHomeResult {
  recommendations: Product[];
}

const EMPTY_RESULT: PersonalizedHomeResult = { recommendations: [] };

/**
 * Server-side wiring behind Home's "Para ti" section (src/app/page.tsx).
 * Kept out of the page component itself so the fail-closed behavior lives
 * in one obvious place: ANY failure here — no session, no Supabase row,
 * a thrown error reading taste_preferences — resolves to an empty result,
 * never a rejected promise. Home always falls back to the existing
 * discovery sections when this comes back empty (cold-start included);
 * personalization is additive, never a single point of failure.
 */
export async function getPersonalizedHomeSection(limit = 10): Promise<PersonalizedHomeResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return EMPTY_RESULT;

    const preferences = await getTastePreferences(user.id);
    if (preferences.length === 0) return EMPTY_RESULT;

    const [products, recentInteractions] = await Promise.all([getAllProducts(), getRecentInteractions()]);
    // Reuses computeTrendingScores() over the same recent-interactions read
    // getTrending() already uses (catalog.ts) — one trending computation,
    // two consumers.
    const trendingScores = computeTrendingScores(recentInteractions);

    const recommendations = recommendProductsForUser({
      products,
      tastePreferences: preferences,
      trendingScores,
      limit,
    });
    return { recommendations };
  } catch {
    return EMPTY_RESULT;
  }
}
