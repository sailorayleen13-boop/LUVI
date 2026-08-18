import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProductInteraction } from "@/lib/marketplace/types";

/**
 * Supabase-backed counterpart to src/lib/marketplace/interactions.ts's
 * trackInteraction() — see Phase 5 Section 6. Mirrors its event shape so
 * swapping the storage layer later is a body change at that file's call
 * sites, not a caller-site rewrite. Adds an explicit actor (userId and/or
 * sessionId), which the localStorage version has no concept of since
 * everything there is already scoped to one browser.
 *
 * Not called from anywhere yet — the live app still tracks interactions via
 * localStorage (interactions.ts); this is infrastructure validation only.
 */
export async function trackInteraction(
  event: Omit<ProductInteraction, "id" | "createdAt">,
  actor: { userId?: string; sessionId?: string },
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("product_interactions").insert({
    type: event.type,
    product_id: event.productId ?? null,
    merchant_id: event.merchantId ?? null,
    category: event.category ?? null,
    query: event.query ?? null,
    region: event.location?.region ?? null,
    user_id: actor.userId ?? null,
    session_id: actor.sessionId ?? null,
  });
  if (error) throw error;
}
