import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAllMerchants,
  getAllProducts,
  getMerchantById,
  getProductBySlug,
  getRelated,
} from "@/lib/marketplace/queries";
import { ProductDetailView } from "@/components/marketplace/product-detail-view";

export function generateStaticParams() {
  return getAllProducts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return {};
  return { title: `${product.name} — LUVI`, description: product.shortDescription };
}

export default async function MarketplaceProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const merchant = getMerchantById(product.merchantId);
  if (!merchant) notFound();

  const related = getRelated(product);
  const relatedMerchants = Object.fromEntries(getAllMerchants().map((m) => [m.id, m]));

  return (
    <ProductDetailView
      product={product}
      merchant={merchant}
      related={related}
      relatedMerchants={relatedMerchants}
    />
  );
}
