import type { Merchant, Product } from "@/lib/marketplace/types";

/**
 * Resolves where "LUVI IT!" should send the customer. Product-level links
 * win (a merchant may point a specific product at its own product page);
 * otherwise falls back to the merchant's general contact channels.
 * Returns undefined when the merchant hasn't given us anywhere to send
 * someone — callers must handle that (disabled CTA), never fabricate a link.
 */
export function resolvePurchaseUrl(product: Product, merchant: Merchant): string | undefined {
  return (
    product.externalPurchaseUrl ??
    product.whatsappUrl ??
    product.instagramUrl ??
    merchant.website ??
    merchant.whatsapp ??
    merchant.instagram
  );
}
