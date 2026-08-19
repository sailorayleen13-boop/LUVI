import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMerchantBySlug, getProductsByMerchant } from "@/lib/marketplace/catalog";
import { MerchantDetailView } from "@/components/marketplace/merchant-detail-view";

// No generateStaticParams: Supabase-backed reads go through the cookie-
// dependent server client (createSupabaseServerClient), which can't run
// during static generation. This route is fully dynamic, consistent with
// the rest of the auth/Supabase-backed app since Phase 6.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const merchant = await getMerchantBySlug(slug);
  if (!merchant) return {};
  return { title: `${merchant.name} — LUVI`, description: merchant.description };
}

export default async function MerchantDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const merchant = await getMerchantBySlug(slug);
  if (!merchant) notFound();

  const products = await getProductsByMerchant(merchant.id);

  return <MerchantDetailView merchant={merchant} products={products} />;
}
