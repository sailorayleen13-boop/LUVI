import type { ProductInteraction } from "@/lib/marketplace/types";
import { recordAuthenticatedInteractionAction } from "@/lib/marketplace/actions";

/**
 * Interaction tracking — still the single event-tracking API the whole app
 * calls (Phase 7 explicitly avoids a second analytics system). Local/
 * anonymous behavior is unchanged from mock mode: events are kept in
 * memory and mirrored to localStorage. As of Phase 7, when a user is
 * signed in (see setInteractionsUserId, called from
 * src/lib/store/auth-context.tsx), the same call ALSO dual-writes to the
 * real Supabase product_interactions table and nudges taste_preferences —
 * fire-and-forget, deliberately never awaited or allowed to throw into the
 * caller, so a failed write degrades personalization, never browsing.
 */

const STORAGE_KEY = "luvi:interactions";

let cache: ProductInteraction[] = [];
let hydrated = false;

// Plain module-level state, not React context: trackInteraction() is
// called from plain hooks (useSaveInteraction, useOutboundClick) that have
// no reason to otherwise depend on auth state, and this file itself isn't
// a component — a setter kept in sync by AuthProvider is the smallest
// change that lets one call site serve both anonymous and authenticated
// users without threading a user id through every caller.
let currentUserId: string | null = null;

export function setInteractionsUserId(userId: string | null): void {
  currentUserId = userId;
}

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) cache = JSON.parse(raw) as ProductInteraction[];
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

function generateId(): string {
  return `int_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Records a ProductInteraction event — see module docblock for the local + Supabase dual-write. */
export function trackInteraction(
  event: Omit<ProductInteraction, "id" | "createdAt">,
): ProductInteraction {
  hydrate();
  const record: ProductInteraction = {
    ...event,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  cache = [...cache, record];
  persist();

  if (currentUserId) {
    // Fire-and-forget: never awaited, and errors are swallowed here so a
    // Supabase hiccup can't turn a wishlist tap or a page view into a
    // visible failure (Phase 7's "fail gracefully" rule).
    void recordAuthenticatedInteractionAction(event).catch(() => {});
  }

  return record;
}

/** Returns all recorded events, most recent first. Mock-mode/dev use only. */
export function getInteractions(): ProductInteraction[] {
  hydrate();
  return [...cache].reverse();
}

export function getInteractionsByProduct(productId: string): ProductInteraction[] {
  return getInteractions().filter((e) => e.productId === productId);
}

export function getInteractionsByType(type: ProductInteraction["type"]): ProductInteraction[] {
  return getInteractions().filter((e) => e.type === type);
}

/** Clears mock-mode interaction history. Test/dev use only. */
export function clearInteractions(): void {
  hydrate();
  cache = [];
  persist();
}
