import type { ProductInteraction } from "@/lib/marketplace/types";

/**
 * Mock-mode interaction tracking. Nothing in the app calls track() yet —
 * this module exists so Phase 2 UI work has a stable function to call, and
 * so the eventual swap to Supabase is "replace this file's internals with
 * an insert," not "invent the event shape while also wiring up UI."
 *
 * In mock mode, events are kept in memory (module-level array) and
 * mirrored to localStorage when available, so they survive a page reload
 * during local testing without needing a backend.
 */

const STORAGE_KEY = "luvi:interactions";

let cache: ProductInteraction[] = [];
let hydrated = false;

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

/** Records a ProductInteraction event. Mock-mode only — see module docblock. */
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
