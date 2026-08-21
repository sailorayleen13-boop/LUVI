import type { Product } from "@/lib/marketplace/types";

/**
 * "Más como esto / Menos como esto / No me interesa" — the discovery
 * product cards' feedback menu (see components/marketplace/
 * discovery-feedback-menu.tsx). This is deliberately a SEPARATE, purely
 * local mechanism from lib/marketplace/interactions.ts's trackInteraction,
 * not a new case of it — see 0001_schema.sql's `interaction_type` enum:
 *
 *   create type interaction_type as enum (
 *     'product_view', 'search', 'save', 'unsave', 'luvi_it_click',
 *     'store_view', 'interest'
 *   );
 *
 * That's a fixed Postgres enum, and this UX pass is explicitly scoped to
 * NOT touch Supabase migrations/schema. Sending one of these three actions
 * through trackInteraction() would either fail the enum check (if written
 * as-is) or silently misrepresent the signal (if forced into an existing
 * value like 'interest', which already means something else — an
 * "I NEED THIS" positive-demand signal, not a negative preference tweak).
 * So for now this module owns its own tiny local store instead: real
 * localStorage persistence (never fake/pretend), just not yet dual-written
 * to Supabase.
 *
 * What a future phase needs to connect this for real, without redesigning
 * it:
 *   1. A migration adding 3 enum values to `interaction_type` (e.g.
 *      'feedback_more_like_this' | 'feedback_less_like_this' |
 *      'feedback_not_interested'), or a small dedicated table if a
 *      one-row-per-product "latest feedback" shape (like this module's) is
 *      preferred over an append-only event log.
 *   2. A signal-weight entry in taste/signal-weights.ts so "menos como
 *      esto"/"no me interesa" nudge taste_preferences negatively the same
 *      way toggleSavedAction's unsave path already does, and "más como
 *      esto" nudges it positively.
 *   3. At that point, recordDiscoveryFeedback() below is exactly the call
 *      site that should ALSO fire the authenticated write (mirroring how
 *      useSaveInteraction.toggle() calls both trackInteraction and
 *      toggleSavedAction today) — the local record stays as the anonymous/
 *      offline-first source of truth, same Decision 2 pattern as Saved.
 */

export type DiscoveryFeedbackAction = "more_like_this" | "less_like_this" | "not_interested";

interface DiscoveryFeedbackRecord {
  productId: string;
  categoryId: Product["category"];
  merchantId: string;
  action: DiscoveryFeedbackAction;
  createdAt: string;
}

const STORAGE_KEY = "luvi:discovery-feedback";

let cache: Record<string, DiscoveryFeedbackRecord> = {};
let hydrated = false;

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) cache = JSON.parse(raw) as Record<string, DiscoveryFeedbackRecord>;
  } catch {
    // ignore corrupt storage
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // ignore quota errors
  }
}

/** Latest feedback wins — a product only ever has one active preference tweak at a time. */
export function recordDiscoveryFeedback(product: Product, action: DiscoveryFeedbackAction): void {
  hydrate();
  cache = {
    ...cache,
    [product.id]: {
      productId: product.id,
      categoryId: product.category,
      merchantId: product.merchantId,
      action,
      createdAt: new Date().toISOString(),
    },
  };
  persist();
}

export function getDiscoveryFeedback(productId: string): DiscoveryFeedbackAction | undefined {
  hydrate();
  return cache[productId]?.action;
}

/** "No me interesa" is the one action with an immediate visual effect — the card collapses locally (see ProductCard). */
export function isHiddenFromDiscovery(productId: string): boolean {
  return getDiscoveryFeedback(productId) === "not_interested";
}

/** Reverses a "no me interesa" — the card's inline "Deshacer" control. */
export function clearDiscoveryFeedback(productId: string): void {
  hydrate();
  if (!(productId in cache)) return;
  const next = { ...cache };
  delete next[productId];
  cache = next;
  persist();
}
