"use client";

import { useActionState } from "react";
import { createQuickProductAction } from "@/lib/merchant/actions";
import { ImageUploader } from "@/components/merchant/image-uploader";
import { CategoryPicker } from "@/components/merchant/category-picker";
import { t } from "@/lib/i18n";
import type { ActionResult } from "@/lib/merchant/actions";

const INITIAL_STATE: ActionResult = {};

const inputClass =
  "rounded-2xl border border-charcoal/10 bg-white px-4 py-3 text-[14.5px] text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-fucsia/40";

/**
 * Publicación rápida (Phase 8 Section 5A) — the entire "Mom Test" flow:
 * photo(s) → name → price → category, nothing else required. Availability
 * defaults to Disponible; contact is inherited from the store automatically
 * (LUVI IT's resolvePurchaseUrl() already falls back to the merchant's
 * contact when a product doesn't set its own — see purchase-link.ts), so
 * this form never asks about it at all.
 */
export function QuickPublishForm({ merchantId }: { merchantId: string }) {
  const [state, formAction, pending] = useActionState(createQuickProductAction, INITIAL_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <p className="text-[13px] font-semibold text-charcoal">{t.seller.quickPhotosLabel}</p>
        <ImageUploader folder={merchantId} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-[13px] font-semibold text-charcoal">
          {t.seller.quickNameLabel}
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder={t.seller.quickNamePlaceholder}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="price" className="text-[13px] font-semibold text-charcoal">
          {t.seller.quickPriceLabel}
        </label>
        <input
          id="price"
          name="price"
          type="number"
          inputMode="decimal"
          min="1"
          step="1"
          required
          placeholder="0"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-[13px] font-semibold text-charcoal">{t.seller.quickCategoryLabel}</p>
        <CategoryPicker />
      </div>

      {state.error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-[13px] font-medium text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-fucsia py-3.5 text-[15px] font-semibold text-white shadow-md transition active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? t.seller.quickPublishingCta : t.seller.quickPublishCta}
      </button>
    </form>
  );
}
