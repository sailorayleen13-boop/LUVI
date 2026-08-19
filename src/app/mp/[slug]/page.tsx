import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllMerchants, getMerchantById, getProductBySlug, getRelated } from "@/lib/marketplace/catalog";
import { ProductDetailView } from "@/components/marketplace/product-detail-view";

// No generateStaticParams — see the same note in app/m/[slug]/page.tsx.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  return { title: `${product.name} — LUVI`, description: product.shortDescription };
}

export default async function MarketplaceProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const merchant = await getMerchantById(product.merchantId);
  if (!merchant) notFound();

  const [related, allMerchants] = await Promise.all([getRelated(product), getAllMerchants()]);
  const relatedMerchants = Object.fromEntries(allMerchants.map((m) => [m.id, m]));

  return (
    <ProductDetailView
      product={product}
      merchant={merchant}
      related={related}
      relatedMerchants={relatedMerchants}
    />
  );
}
