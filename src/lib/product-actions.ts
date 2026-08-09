"use client";

import { getAvailabilityPresentation } from "@/lib/availability";
import { useCart } from "@/lib/store/cart-context";
import { useInterest } from "@/lib/store/interest-context";
import { useToast } from "@/lib/store/toast-context";
import type { Product } from "@/lib/types";

/**
 * Single place that turns a product's availability state into the right
 * customer action — add to cart, reserve a preorder, register interest, or
 * request a restock notification. Card quick-add and the detail page's
 * sticky CTA both call this so the behavior per state only lives once.
 */
export function useProductActions(product: Product) {
  const { addItem } = useCart();
  const { hasInterest, registerInterest, hasNotifyRequest, registerNotify } = useInterest();
  const { showToast } = useToast();

  const presentation = getAvailabilityPresentation(product);

  function trigger(quantity = 1) {
    switch (presentation.ctaKind) {
      case "add-to-cart":
        addItem(product.id, quantity, "in_stock");
        showToast(`${product.name} — LUVI IT! 🛍️`);
        break;
      case "preorder":
        addItem(product.id, quantity, "preorder");
        showToast(
          product.deliveryEstimate
            ? `Reservado 💗 Entrega estimada: ${product.deliveryEstimate}`
            : "Reservado para el próximo restock 💗",
        );
        break;
      case "interest":
        registerInterest(product.id);
        showToast("¡Anotado! Te avisamos cuando esté disponible 👀");
        break;
      case "notify":
        registerNotify(product.id);
        showToast("Te vamos a avisar cuando vuelva 🔔");
        break;
    }
  }

  return {
    presentation,
    trigger,
    alreadyInterested: hasInterest(product.id),
    alreadyRequestedNotify: hasNotifyRequest(product.id),
  };
}
