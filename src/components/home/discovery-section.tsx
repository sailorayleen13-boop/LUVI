import type { Product } from "@/lib/types";
import { SectionHeader } from "@/components/home/section-header";
import { HorizontalScroller } from "@/components/home/horizontal-scroller";
import { ProductCard } from "@/components/product/product-card";

export function DiscoverySection({
  title,
  subtitle,
  href,
  products,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  products: Product[];
}) {
  if (products.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title={title} subtitle={subtitle} href={href} />
      <HorizontalScroller>
        {products.map((product) => (
          <div key={product.id} className="w-[42%] flex-none snap-start">
            <ProductCard product={product} />
          </div>
        ))}
      </HorizontalScroller>
    </section>
  );
}
