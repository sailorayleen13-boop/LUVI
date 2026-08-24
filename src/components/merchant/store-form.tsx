"use client";

import { useActionState, useState } from "react";
import { Camera } from "lucide-react";
import { createStoreAction, updateStoreAction, type ActionResult } from "@/lib/merchant/actions";
import { uploadMerchantMedia } from "@/lib/marketplace/supabase/upload";
import { CR_PROVINCES } from "@/lib/marketplace/region-config";
import { MerchantLogo } from "@/components/marketplace/merchant-logo";
import { t } from "@/lib/i18n";
import type { Merchant } from "@/lib/marketplace/types";

const INITIAL_STATE: ActionResult = {};

/** Store's whatsapp/instagram are saved as full URLs (see actions.ts's normalizeWhatsapp/normalizeInstagram) so editing shows the seller their original phone number/handle back, not a URL — matching the "type a number, not a link" promise the input labels make. */
function displayWhatsapp(url?: string): string {
  if (!url) return "";
  const match = url.match(/wa\.me\/(\d+)/);
  return match ? match[1] : url;
}

function displayInstagram(url?: string): string {
  if (!url) return "";
  const match = url.match(/instagram\.com\/(.+)$/);
  return match ? match[1] : url;
}

const inputClass =
  "rounded-2xl border border-charcoal/10 bg-white px-4 py-3 text-[14.5px] text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-fucsia/40";

/**
 * Shared by /sell (mode="create") and /merchant/settings (mode="edit") —
 * same three questions either way (Phase 8 Section 4/14): business name,
 * location, contact. Edit mode just arrives pre-filled and posts to
 * updateStoreAction instead. Logo upload lives only in edit mode: a store
 * has to exist first for the Storage path's ownership check to have
 * anything to scope to (see upload.ts's folder-is-merchant-id convention),
 * which is also exactly why Section 4 says a logo should never block
 * onboarding — it's naturally a step-two thing here, not a workaround.
 */
export function StoreForm({ mode, merchant }: { mode: "create" | "edit"; merchant?: Merchant }) {
  const action = mode === "create" ? createStoreAction : updateStoreAction;
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  const [logo, setLogo] = useState(merchant?.logo ?? "");
  const [logoError, setLogoError] = useState<string | undefined>();
  const [uploadingLogo, setUploadingLogo] = useState(false);

  async function handleLogoChange(file: File | undefined) {
    if (!file || !merchant) return;
    setLogoError(undefined);
    setUploadingLogo(true);
    const result = await uploadMerchantMedia(file, merchant.id);
    setUploadingLogo(false);
    if ("error" in result) {
      setLogoError(result.error);
      return;
    }
    setLogo(result.url);
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-[13px] font-semibold text-charcoal">
          {t.seller.nameLabel}
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={merchant?.name}
          placeholder={t.seller.namePlaceholder}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-semibold text-charcoal">{t.seller.locationLabel}</p>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="region" className="text-[12px] text-charcoal-faint">
            {t.seller.regionLabel}
          </label>
          <select
            id="region"
            name="region"
            defaultValue={merchant?.location.region ?? ""}
            className={inputClass}
          >
            <option value="">{t.seller.regionPlaceholder}</option>
            {CR_PROVINCES.map((province) => (
              <option key={province} value={province}>
                {province}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="city" className="text-[12px] text-charcoal-faint">
            {t.seller.cityLabel}
          </label>
          <input
            id="city"
            name="city"
            defaultValue={merchant?.location.city}
            placeholder={t.seller.cityPlaceholder}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="addressOptional" className="text-[12px] text-charcoal-faint">
            {t.seller.addressLabel}
          </label>
          <input
            id="addressOptional"
            name="addressOptional"
            defaultValue={merchant?.location.addressOptional}
            placeholder={t.seller.addressPlaceholder}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-semibold text-charcoal">{t.seller.contactLabel}</p>
        <p className="text-[11.5px] text-charcoal-faint">{t.seller.contactHint}</p>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="whatsapp" className="text-[12px] text-charcoal-faint">
            {t.seller.whatsappLabel}
          </label>
          <input
            id="whatsapp"
            name="whatsapp"
            type="tel"
            inputMode="tel"
            defaultValue={displayWhatsapp(merchant?.whatsapp)}
            placeholder={t.seller.whatsappPlaceholder}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="instagram" className="text-[12px] text-charcoal-faint">
            {t.seller.instagramLabel}
          </label>
          <input
            id="instagram"
            name="instagram"
            defaultValue={displayInstagram(merchant?.instagram)}
            placeholder={t.seller.instagramPlaceholder}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="website" className="text-[12px] text-charcoal-faint">
            {t.seller.websiteLabel}
          </label>
          <input
            id="website"
            name="website"
            defaultValue={merchant?.website}
            placeholder={t.seller.websitePlaceholder}
            className={inputClass}
          />
        </div>
      </div>

      {mode === "edit" && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[13px] font-semibold text-charcoal">{t.seller.logoLabel}</p>
          <div className="flex items-center gap-3">
            <MerchantLogo logo={logo || "🏪"} className="h-14 w-14 text-2xl" />
            <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-charcoal/10 px-4 py-2 text-[12.5px] font-semibold text-charcoal-soft active:bg-charcoal/[0.03]">
              <Camera size={14} />
              {uploadingLogo ? t.seller.uploadingPhoto : t.seller.addPhotosCta}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                className="hidden"
                disabled={uploadingLogo}
                onChange={(e) => handleLogoChange(e.target.files?.[0])}
              />
            </label>
          </div>
          {logoError && <p className="text-[12px] font-medium text-red-600">{logoError}</p>}
          <input type="hidden" name="logo" value={logo} />
        </div>
      )}

      {state.error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-[13px] font-medium text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-fucsia py-3.5 text-[15px] font-semibold text-white shadow-md transition active:scale-[0.98] disabled:opacity-60"
      >
        {mode === "create"
          ? pending
            ? t.seller.creatingCta
            : t.seller.createCta
          : pending
            ? t.seller.savingCta
            : t.seller.saveChangesCta}
      </button>
    </form>
  );
}
