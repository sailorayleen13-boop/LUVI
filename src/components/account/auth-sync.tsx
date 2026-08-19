"use client";

import { useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useWishlist } from "@/lib/store/wishlist-context";
import { mergeLocalSavedAction } from "@/lib/marketplace/actions";

/**
 * Invisible — renders nothing. Listens for a genuine SIGNED_IN auth event
 * (fires on sign-up/sign-in, NOT on a page reload with an already-existing
 * session, which fires INITIAL_SESSION instead) and merges this browser's
 * local wishlist into the user's Supabase saved_products via
 * mergeLocalSavedAction (Phase 6's mergeLocalSavedProducts, additive-only —
 * see that function's docstring). Guarded to run at most once per mount so
 * a token refresh or tab focus doesn't re-trigger it; re-running would be
 * harmless (the merge is idempotent) but pointless.
 *
 * Deliberately does not clear localStorage after merging — Decision 2
 * requires local saves are never lost, and leaving them in place costs
 * nothing since the merge is a no-op upsert on ids already present.
 */
export function AuthSync() {
  const { productIds } = useWishlist();
  const hasMergedRef = useRef(false);
  const productIdsRef = useRef(productIds);

  // Refs must be written outside render (effects/handlers), not during it —
  // keep the ref in sync via its own effect rather than mutating it inline.
  useEffect(() => {
    productIdsRef.current = productIds;
  }, [productIds]);

  useEffect(() => {
    // Never let a missing/misconfigured Supabase project throw here — this
    // mounts app-wide (see Providers), so an uncaught error would have
    // nothing to do with whatever the visitor is actually doing.
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
        if (event !== "SIGNED_IN" || hasMergedRef.current) return;
        hasMergedRef.current = true;
        void mergeLocalSavedAction(productIdsRef.current).catch(() => {});
      });
      return () => subscription.subscription.unsubscribe();
    } catch {
      return undefined;
    }
  }, []);

  return null;
}
