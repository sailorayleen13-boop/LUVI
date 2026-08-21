import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAllDrops,
  getAllMerchants,
  getDropBySlug,
  getProductsForDrop,
} from "@/lib/marketplace/queries";
import { t } from "@/lib/i18n";
import { MarketplaceHeader } from "@/components/marketplace/marketplace-header";
import { ProductCard } from "@/components/marketplace/product-card";

export function generateStaticParams() {
  return getAllDrops().map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const drop = getDropBySlug(slug);
  if (!drop) return {};
  return { title: `${drop.name} — LUVI`, description: drop.description };
}

/**
 * Editorial collection detail — products from potentially many independent
 * merchants, curated by LUVI. No countdown, no scarcity language, no
 * inventory behavior: Drops are a discovery surface, not a LUVI-owned
 * procurement drop.
 */
export default async function DropDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const drop = getDropBySlug(slug);
  if (!drop) notFound();

  const products = getProductsForDrop(drop);
  const merchantsById = Object.fromEntries(getAllMerchants().map((m) => [m.id, m]));
  const merchantCount = new Set(products.map((p) => p.merchantId)).size;

  return (
    <>
      <MarketplaceHeader title={drop.name} />

      <main className="flex flex-col gap-5 pb-8">
        <div className="flex flex-col gap-2 px-4 pt-2">
          <span className="text-4xl" aria-hidden>
            {drop.coverEmoji}
          </span>
          <h1 className="font-display text-2xl font-bold leading-tight text-charcoal">
            {drop.name}
          </h1>
          {drop.description && (
            <p className="text-[14px] leading-relaxed text-charcoal-soft">{drop.description}</p>
          )}
          {merchantCount > 1 && (
            <p className="text-[12.5px] font-medium text-fucsia-dark">
              {t.drops.includesPrefix} {merchantCount} {t.drops.merchantsSuffix}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-5 px-4 md:grid-cols-3 md:gap-x-4 md:gap-y-6 lg:grid-cols-4 lg:gap-x-5 xl:grid-cols-5">
          {products.map((product) => {
            const merchant = merchantsById[product.merchantId];
            if (!merchant) return null;
            return <ProductCard key={product.id} product={product} merchant={merchant} />;
          })}
        </div>
      </main>
    </>
  );
}
