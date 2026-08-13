"use client";

import { trackInteraction } from "@/lib/marketplace/interactions";
import { resolvePurchaseUrl } from "@/lib/marketplace/purchase-link";
import { useToast } from "@/lib/store/toast-context";
import { t } from "@/lib/i18n";
import type { Merchant, Product } from "@/lib/marketplace/types";

/**
 * "LUVI IT!" behavior: track the click, then open the resolved merchant
 * link in a new tab. LUVI never fulfills the purchase itself.
 *
 * Wraps trackInteraction() rather than the UI calling it directly, so
 * swapping mock/local tracking for a real server call (Phase 3/4) only
 * touches this hook and interactions.ts — components don't change.
 */
export function useOutboundClick(product: Product, merchant: Merchant) {
  const { showToast } = useToast();

  function trigger() {
    const url = resolvePurchaseUrl(product, merchant);
    if (!url) {
      showToast(t.outbound.unavailable);
      return;
    }

    trackInteraction({
      type: "luvi_it_click",
      productId: product.id,
      merchantId: merchant.id,
      category: product.category,
    });

    showToast(`${t.outbound.redirectingPrefix} ${merchant.name} 🛍️`);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return { trigger, hasLink: Boolean(resolvePurchaseUrl(product, merchant)) };
}
