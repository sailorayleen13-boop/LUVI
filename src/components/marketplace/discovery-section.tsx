import { Sparkles } from "lucide-react";
import type { Merchant, Product } from "@/lib/marketplace/types";
import { SectionHeader } from "@/components/home/section-header";
import { HorizontalScroller } from "@/components/home/horizontal-scroller";
import { ProductCard } from "@/components/marketplace/product-card";
import { CompactProductRow } from "@/components/marketplace/compact-product-row";
import { t } from "@/lib/i18n";

export type DiscoverySectionVariant =
  /** The original/default layout: one row of square ProductCards. */
  | "row"
  /** Same row, but the first 3 cards carry a numbered corner badge (Trending). */
  | "ranked"
  /** Wrapped in a soft tinted band with an eyebrow label — reads as a featured LUVI feature, not just another row ("Para vos"). */
  | "spotlight"
  /** Products chunked into columns of 3 compact list rows instead of square cards — a different rhythm for a section that has no more claim to "featured" than a plain row (Most LUVI'd). */
  | "stack";

const STACK_GROUP_SIZE = 3;

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) groups.push(items.slice(i, i + size));
  return groups;
}

/**
 * Marketplace equivalent of the ecommerce MVP's DiscoverySection — same
 * layout primitives (SectionHeader, HorizontalScroller), now with a small
 * set of presentation variants so Home's sections don't all read as
 * identical "title + row of square cards" (see the discovery UX pass).
 * `variant` defaults to "row", i.e. every existing call site keeps its
 * exact prior appearance unless it opts into something else.
 */
export function DiscoverySection({
  title,
  products,
  merchants,
  variant = "row",
}: {
  title: string;
  products: Product[];
  merchants: Record<string, Merchant>;
  variant?: DiscoverySectionVariant;
}) {
  if (products.length === 0) return null;

  if (variant === "stack") {
    const groups = chunk(products, STACK_GROUP_SIZE);
    return (
      <section className="flex flex-col gap-3">
        <SectionHeader title={title} />
        <HorizontalScroller>
          {groups.map((group, i) => (
            <div
              key={group[0]?.id ?? i}
              className="flex w-[78%] flex-none snap-start flex-col divide-y divide-charcoal/[0.06] rounded-2xl border border-charcoal/8 p-1.5 md:w-[300px]"
            >
              {group.map((product) => {
                const merchant = merchants[product.merchantId];
                if (!merchant) return null;
                return <CompactProductRow key={product.id} product={product} merchant={merchant} />;
              })}
            </div>
          ))}
        </HorizontalScroller>
      </section>
    );
  }

  const row = (
    <HorizontalScroller>
      {products.map((product, i) => {
        const merchant = merchants[product.merchantId];
        if (!merchant) return null;
        return (
          // Percentage width lets mobile peek the next card at any phone
          // size; fixed widths take over from md up so cards stay a
          // sane, hand-sized size instead of ballooning with the
          // container (see Responsive UX pass — desktop/tablet layouts).
          <div
            key={product.id}
            className="w-[42%] flex-none snap-start md:w-[200px] lg:w-[210px] xl:w-[224px]"
          >
            <ProductCard product={product} merchant={merchant} rank={variant === "ranked" && i < 3 ? i + 1 : undefined} />
          </div>
        );
      })}
    </HorizontalScroller>
  );

  if (variant === "spotlight") {
    return (
      <section className="flex flex-col gap-3 bg-gradient-to-b from-fucsia-light/60 via-fucsia-light/15 to-transparent py-4 lg:mx-4 lg:rounded-[28px]">
        <div className="flex items-center gap-1 px-4">
          <Sparkles size={13} className="text-fucsia-dark" aria-hidden />
          <span className="text-[11px] font-bold uppercase tracking-wider text-fucsia-dark">
            {t.discovery.forYouEyebrow}
          </span>
        </div>
        <SectionHeader title={title} />
        {row}
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title={title} />
      {row}
    </section>
  );
}
