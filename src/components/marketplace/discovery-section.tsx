import type { Merchant, Product } from "@/lib/marketplace/types";
import { SectionHeader } from "@/components/home/section-header";
import { HorizontalScroller } from "@/components/home/horizontal-scroller";
import { ProductCard } from "@/components/marketplace/product-card";

/**
 * Marketplace equivalent of the ecommerce MVP's DiscoverySection — same
 * layout primitives (SectionHeader, HorizontalScroller, 42%-width snap
 * cards), reused as-is since they're generic. Only ProductCard/Product
 * differ.
 */
export function DiscoverySection({
  title,
  products,
  merchants,
}: {
  title: string;
  products: Product[];
  merchants: Record<string, Merchant>;
}) {
  if (products.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title={title} />
      <HorizontalScroller>
        {products.map((product) => {
          const merchant = merchants[product.merchantId];
          if (!merchant) return null;
          return (
            <div key={product.id} className="w-[42%] flex-none snap-start">
              <ProductCard product={product} merchant={merchant} />
            </div>
          );
        })}
      </HorizontalScroller>
    </section>
  );
}
