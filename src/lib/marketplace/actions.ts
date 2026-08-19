"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getSavedProductIds,
  mergeLocalSavedProducts,
  saveProduct,
  unsaveProduct,
} from "@/lib/marketplace/supabase/saved-products";
import { recordInferredSignal } from "@/lib/marketplace/taste/queries";
import { CATEGORY_SIGNAL_WEIGHT, MERCHANT_SIGNAL_WEIGHT } from "@/lib/marketplace/taste/signal-weights";
import type { ProductInteraction } from "@/lib/marketplace/types";

/**
 * Server Actions boundary for authenticated marketplace writes — the
 * pieces of Phase 6's repository (mergeLocalSavedProducts, saveProduct,
 * unsaveProduct) that were "not called from anywhere yet" now get called
 * from here, reached from client components (the wishlist heart, the
 * auth-sync effect). Every function resolves the current user from the
 * session itself (getCurrentUser) rather than trusting a client-supplied
 * id, and no-ops for an anonymous caller — callers never need their own
 * "am I signed in" branch before calling these.
 */

/**
 * Additive merge of local (anonymous) saved product ids into the signed-in
 * user's Supabase saved_products — called once right after sign-in (see
 * src/components/account/auth-sync.tsx). No-op if there's nothing to merge.
 */
export async function mergeLocalSavedAction(productIds: string[]): Promise<void> {
  const user = await getCurrentUser();
  if (!user || productIds.length === 0) return;
  await mergeLocalSavedProducts(user.id, productIds);
}

/**
 * Server-side saved product ids for the current user, e.g. saved from a
 * different device — returns [] for an anonymous caller so /saved can call
 * this unconditionally and just union the result with the local wishlist.
 */
export async function getServerSavedProductIdsAction(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  return getSavedProductIds(user.id);
}

/** Adds/removes the Supabase-backed saved_products row for the current user. */
export async function toggleSavedAction(productId: string, nowSaved: boolean): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  if (nowSaved) {
    await saveProduct(user.id, productId);
  } else {
    await unsaveProduct(user.id, productId);
  }
}

/**
 * Dual-write target for trackInteraction() (src/lib/marketplace/interactions.ts)
 * once a user is signed in: inserts the raw event into the real
 * product_interactions table (Phase 6 infrastructure, previously unused —
 * this is what activates it, not a second analytics system) and nudges the
 * relevant taste_preferences weights via the signal-weight table. Intended
 * to be called fire-and-forget; failures here must never surface to the
 * caller (see interactions.ts's catch) — dropping a personalization signal
 * degrades recommendations, it must never break browsing or saving.
 */
export async function recordAuthenticatedInteractionAction(
  event: Omit<ProductInteraction, "id" | "createdAt">,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const supabase = await createSupabaseServerClient();
  await supabase.from("product_interactions").insert({
    type: event.type,
    product_id: event.productId ?? null,
    merchant_id: event.merchantId ?? null,
    category: event.category ?? null,
    query: event.query ?? null,
    region: event.location?.region ?? null,
    user_id: user.id,
  });

  const categoryDelta = CATEGORY_SIGNAL_WEIGHT[event.type];
  if (categoryDelta && event.category) {
    await recordInferredSignal(user.id, "category", event.category, categoryDelta);
  }
  const merchantDelta = MERCHANT_SIGNAL_WEIGHT[event.type];
  if (merchantDelta && event.merchantId) {
    await recordInferredSignal(user.id, "merchant", event.merchantId, merchantDelta);
  }
}
