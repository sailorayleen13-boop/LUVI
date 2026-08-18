import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllProducts, getDropById, getProductBySlug, getRelated } from "@/lib/queries";
import { ProductDetailView } from "@/components/product/product-detail-view";

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
  return {
    title: `${product.name} — LUVI`,
    description: product.shortDescription,
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const related = getRelated(product);
  const drop = product.dropId ? getDropById(product.dropId) : undefined;

  return <ProductDetailView product={product} related={related} drop={drop} />;
}
