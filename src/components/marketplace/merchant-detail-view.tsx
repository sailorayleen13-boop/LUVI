"use client";

import { useEffect } from "react";
import { Camera, Globe, MessageCircle } from "lucide-react";
import type { Merchant, Product } from "@/lib/marketplace/types";
import { trackInteraction } from "@/lib/marketplace/interactions";
import { t } from "@/lib/i18n";
import { MarketplaceHeader } from "@/components/marketplace/marketplace-header";
import { ProductCard } from "@/components/marketplace/product-card";

export function MerchantDetailView({
  merchant,
  products,
}: {
  merchant: Merchant;
  products: Product[];
}) {
  useEffect(() => {
    trackInteraction({ type: "store_view", merchantId: merchant.id });
  }, [merchant.id]);

  const location = [merchant.location.city, merchant.location.region].filter(Boolean).join(", ");

  return (
    <>
      <MarketplaceHeader title={merchant.name} />

      <main className="flex flex-col gap-5 pb-8">
        <div className="flex flex-col items-center gap-2 px-4 pt-2 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-cream-soft text-3xl" aria-hidden>
            {merchant.logo}
          </span>
          <h1 className="font-display text-xl font-bold text-charcoal">{merchant.name}</h1>
          <p className="text-[12.5px] text-charcoal-faint">{location}</p>
          <p className="max-w-xs text-[13.5px] leading-relaxed text-charcoal-soft">
            {merchant.description}
          </p>

          {(merchant.website || merchant.whatsapp || merchant.instagram) && (
            <div className="mt-1 flex items-center gap-2">
              {merchant.website && (
                <a
                  href={merchant.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Sitio web"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-cream-soft text-charcoal active:scale-90"
                >
                  <Globe size={16} />
                </a>
              )}
              {merchant.whatsapp && (
                <a
                  href={merchant.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-cream-soft text-charcoal active:scale-90"
                >
                  <MessageCircle size={16} />
                </a>
              )}
              {merchant.instagram && (
                <a
                  href={merchant.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-cream-soft text-charcoal active:scale-90"
                >
                  <Camera size={16} />
                </a>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 px-4">
          <h2 className="font-display text-[15px] font-semibold text-charcoal">
            {t.merchant.productsHeading}
          </h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-5">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} merchant={merchant} />
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
