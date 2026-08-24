"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { saveProductAction, type ActionResult } from "@/lib/merchant/actions";
import { ImageUploader, type UploadedImage } from "@/components/merchant/image-uploader";
import { CategoryPicker } from "@/components/merchant/category-picker";
import { t } from "@/lib/i18n";
import type { MerchantAvailability } from "@/lib/marketplace/types";
import type { OwnedProduct } from "@/lib/marketplace/supabase/merchant-repository";

const INITIAL_STATE: ActionResult = {};
const AVAILABILITY_OPTIONS: MerchantAvailability[] = ["IN_STOCK", "PREORDER", "COMING_SOON", "SOLD_OUT"];

const inputClass =
  "rounded-2xl border border-charcoal/10 bg-white px-4 py-3 text-[14.5px] text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-fucsia/40";

/**
 * Crear publicación completa AND edit both use this (Phase 8 Section 5B/6):
 * same saveProductAction, a hidden `productId` decides insert vs update.
 * "Más detalles" hides original price / delivery estimate / per-product
 * contact override / external link behind one toggle — Section 6's rule
 * that sophistication is progressive disclosure on ONE form, not a second
 * "advanced" form. The AI-assisted-listing future (Section 7/25) hooks in
 * right where photos are uploaded, before any field is filled — nothing
 * here needs to change shape to add that later, it would just pre-fill
 * these same fields for the seller to confirm/edit.
 */
export function ProductForm({
  merchantId,
  product,
  initialImages = [],
  justPublished = false,
}: {
  merchantId: string;
  product?: OwnedProduct;
  initialImages?: UploadedImage[];
  justPublished?: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveProductAction, INITIAL_STATE);
  const [showMore, setShowMore] = useState(
    Boolean(product?.originalPrice || product?.deliveryEstimate || product?.whatsappUrl || product?.instagramUrl || product?.externalPurchaseUrl),
  );
  const [intent, setIntent] = useState<"draft" | "publish">("publish");

  const isEdit = Boolean(product);
  const folder = isEdit ? `${merchantId}/${product!.id}` : merchantId;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {product && <input type="hidden" name="productId" value={product.id} />}

      {justPublished && (
        <p className="rounded-xl bg-fucsia-light px-3 py-2 text-[13px] font-medium text-fucsia-dark">
          {t.seller.publishedNotice}
        </p>
      )}
      {!justPublished && product?.isDraft && (
        <p className="rounded-xl bg-cream-soft px-3 py-2 text-[13px] font-medium text-charcoal-soft">
          {t.seller.savedDraftNotice}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <p className="text-[13px] font-semibold text-charcoal">{t.seller.quickPhotosLabel}</p>
        <ImageUploader
          folder={folder}
          productId={product?.id}
          initialImages={initialImages}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-[13px] font-semibold text-charcoal">
          {t.seller.productNameLabel}
        </label>
        <input id="name" name="name" required defaultValue={product?.name} className={inputClass} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-[13px] font-semibold text-charcoal">
          {t.seller.productDescriptionLabel}
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={product?.description}
          placeholder={t.seller.productDescriptionPlaceholder}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-[13px] font-semibold text-charcoal">{t.seller.productCategoryLabel}</p>
        <CategoryPicker defaultValue={product?.category} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="price" className="text-[13px] font-semibold text-charcoal">
            {t.seller.productPriceLabel}
          </label>
          <input
            id="price"
            name="price"
            type="number"
            inputMode="decimal"
            min="1"
            step="1"
            defaultValue={product?.price}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="availability" className="text-[13px] font-semibold text-charcoal">
            {t.seller.productAvailabilityLabel}
          </label>
          <select
            id="availability"
            name="availability"
            defaultValue={product?.availability ?? "IN_STOCK"}
            className={inputClass}
          >
            {AVAILABILITY_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {t.availability[value]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowMore((v) => !v)}
        className="flex items-center gap-1.5 self-start text-[13px] font-semibold text-fucsia-dark"
      >
        {showMore ? t.seller.lessDetailsCta : t.seller.moreDetailsCta}
        {showMore ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>

      {showMore && (
        <div className="flex flex-col gap-4 rounded-2xl bg-cream-soft p-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="originalPrice" className="text-[12.5px] font-semibold text-charcoal">
              {t.seller.originalPriceLabel}
            </label>
            <input
              id="originalPrice"
              name="originalPrice"
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              defaultValue={product?.originalPrice}
              className={inputClass}
            />
            <p className="text-[11px] text-charcoal-faint">{t.seller.originalPriceHint}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="deliveryEstimate" className="text-[12.5px] font-semibold text-charcoal">
              {t.seller.deliveryEstimateLabel}
            </label>
            <input
              id="deliveryEstimate"
              name="deliveryEstimate"
              defaultValue={product?.deliveryEstimate}
              placeholder={t.seller.deliveryEstimatePlaceholder}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-[12.5px] font-semibold text-charcoal">{t.seller.productContactLabel}</p>
            <p className="text-[11px] text-charcoal-faint">{t.seller.productContactHint}</p>
            <input
              name="whatsappUrl"
              type="tel"
              inputMode="tel"
              defaultValue={product?.whatsappUrl?.match(/wa\.me\/(\d+)/)?.[1]}
              placeholder={t.seller.whatsappPlaceholder}
              className={inputClass}
            />
            <input
              name="instagramUrl"
              defaultValue={product?.instagramUrl?.match(/instagram\.com\/(.+)$/)?.[1]}
              placeholder={t.seller.instagramPlaceholder}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="externalPurchaseUrl" className="text-[12.5px] font-semibold text-charcoal">
              {t.seller.externalLinkLabel}
            </label>
            <input
              id="externalPurchaseUrl"
              name="externalPurchaseUrl"
              defaultValue={product?.externalPurchaseUrl}
              className={inputClass}
            />
          </div>
        </div>
      )}

      {state.error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-[13px] font-medium text-red-600">{state.error}</p>
      )}

      <div className="flex flex-col gap-2">
        {isEdit && (
          <Link
            href={`/mp/${product!.slug}`}
            className="text-center text-[13px] font-semibold text-fucsia-dark"
          >
            {t.seller.previewCta}
          </Link>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            name="publish"
            value="0"
            onClick={() => setIntent("draft")}
            disabled={pending}
            className="flex-1 rounded-full border border-charcoal/15 py-3.5 text-[14px] font-semibold text-charcoal-soft transition active:scale-[0.98] disabled:opacity-60"
          >
            {pending && intent === "draft" ? t.seller.savingDraftCta : t.seller.saveDraftCta}
          </button>
          <button
            type="submit"
            name="publish"
            value="1"
            onClick={() => setIntent("publish")}
            disabled={pending}
            className="flex-1 rounded-full bg-fucsia py-3.5 text-[14px] font-semibold text-white shadow-md transition active:scale-[0.98] disabled:opacity-60"
          >
            {pending && intent === "publish" ? t.seller.publishingCta : t.seller.publishCta}
          </button>
        </div>
      </div>
    </form>
  );
}
