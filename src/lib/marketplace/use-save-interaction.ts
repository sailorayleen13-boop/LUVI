"use client";

import { useWishlist } from "@/lib/store/wishlist-context";
import { trackInteraction } from "@/lib/marketplace/interactions";
import { useToast } from "@/lib/store/toast-context";
import { t } from "@/lib/i18n";
import type { Product } from "@/lib/marketplace/types";

/**
 * Save/unsave for a marketplace product. Reuses the existing WishlistProvider
 * as-is (it's just a Set<string> of ids in localStorage — genuinely
 * generic, not ecommerce-specific) and layers the SAVE/UNSAVE
 * ProductInteraction event + toast on top.
 */
export function useSaveInteraction(product: Product) {
  const { isWishlisted, toggleWishlist } = useWishlist();
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
    showToast(nowSaved ? t.wishlist.added : t.wishlist.removed);
  }

  return { saved, toggle };
}
