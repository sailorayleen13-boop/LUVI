import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllMerchants, getMerchantBySlug, getProductsByMerchant } from "@/lib/marketplace/queries";
import { MerchantDetailView } from "@/components/marketplace/merchant-detail-view";

export function generateStaticParams() {
  return getAllMerchants().map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const merchant = getMerchantBySlug(slug);
  if (!merchant) return {};
  return { title: `${merchant.name} — LUVI`, description: merchant.description };
}

export default async function MerchantDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const merchant = getMerchantBySlug(slug);
  if (!merchant) notFound();

  const products = getProductsByMerchant(merchant.id);

  return <MerchantDetailView merchant={merchant} products={products} />;
}
