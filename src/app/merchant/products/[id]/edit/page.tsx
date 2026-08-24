import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getOwnedMerchant,
  getOwnedProductById,
  getProductImages,
} from "@/lib/marketplace/supabase/merchant-repository";
import { MarketplaceHeader } from "@/components/marketplace/marketplace-header";
import { ProductForm } from "@/components/merchant/product-form";

/**
 * Same route for "finish a draft later" and "edit a published product"
 * (Phase 8 Section 9) — both are just this page with different starting
 * data; there's no separate resume-draft flow to maintain.
 */
export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ published?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/account");
  const merchant = await getOwnedMerchant(user.id).catch(() => null);
  if (!merchant) redirect("/sell");

  const { id } = await params;
  const { published } = await searchParams;

  const product = await getOwnedProductById(id).catch(() => undefined);
  if (!product || product.merchantId !== merchant.id) notFound();

  const images = await getProductImages(product.id).catch(() => []);

  return (
    <>
      <MarketplaceHeader title={product.name} />
      <main className="flex flex-col gap-1 px-4 pb-10">
        <ProductForm
          merchantId={merchant.id}
          product={product}
          initialImages={images}
          justPublished={published === "1"}
        />
      </main>
    </>
  );
}
