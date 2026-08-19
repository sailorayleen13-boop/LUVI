"use client";

import { useWishlist } from "@/lib/store/wishlist-context";
import { useAuth } from "@/lib/store/auth-context";
import { trackInteraction } from "@/lib/marketplace/interactions";
import { toggleSavedAction } from "@/lib/marketplace/actions";
import { useToast } from "@/lib/store/toast-context";
import { t } from "@/lib/i18n";
import type { Product } from "@/lib/marketplace/types";

/**
 * Save/unsave for a marketplace product. Local wishlist state (localStorage
 * via WishlistProvider) stays the source of truth for THIS browser
 * regardless of auth state — Decision 2 (Phase 5/7): anonymous saving never
 * requires an account, and staying local-first here means /saved keeps
 * working identically offline or before the merge-on-login effect runs.
 * When signed in, the same toggle ALSO writes through to the real
 * saved_products table (fire-and-forget, same fail-quiet rule as
 * interactions.ts) so Saved persists across devices — see
 * src/lib/marketplace/actions.ts's toggleSavedAction.
 */
export function useSaveInteraction(product: Product) {
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { user } = useAuth();
  const { showToast } = useToast();

  const saved = isWishlisted(product.id);

  function toggle() {
    const nowSaved = toggleWishlist(product.id);
    trackInteraction({
      type: nowSaved ? "save" : "unsave",
      productId: product.id,
      merchantId: product.merchantId,
      category: product.category,
    });
    if (user) {
      void toggleSavedAction(product.id, nowSaved).catch(() => {});
    }
    showToast(nowSaved ? t.wishlist.added : t.wishlist.removed);
  }

  return { saved, toggle };
}
