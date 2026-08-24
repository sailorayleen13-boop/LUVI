"use client";

import { useState } from "react";
import { Camera, X, Loader2 } from "lucide-react";
import { uploadMerchantMedia } from "@/lib/marketplace/supabase/upload";
import { attachProductImageAction, deleteProductImageAction } from "@/lib/merchant/actions";
import { t } from "@/lib/i18n";

export interface UploadedImage {
  id?: string;
  url: string;
}

/**
 * Mobile-camera-first multi-image uploader (Phase 8 Section 13/22) — two
 * modes depending on whether a product row exists yet:
 *
 * - `productId` set (editing an existing product): each photo is attached
 *   to the DB immediately via attachProductImageAction/
 *   deleteProductImageAction, since there's already a row to attach to.
 * - `productId` unset (Quick Publish, or the first save of a new full
 *   listing): photos only exist in Storage + this component's local state
 *   until the surrounding <form> submits — each uploaded url rides along
 *   as a hidden `imageUrl` field, and the owning Server Action (
 *   createQuickProductAction / saveProductAction) attaches them once the
 *   product id exists.
 */
export function ImageUploader({
  folder,
  productId,
  initialImages = [],
  max = 6,
}: {
  folder: string;
  productId?: string;
  initialImages?: UploadedImage[];
  max?: number;
}) {
  const [images, setImages] = useState<UploadedImage[]>(initialImages);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(undefined);
    const remaining = max - images.length;
    const toUpload = Array.from(files).slice(0, remaining);

    setUploading(true);
    for (const file of toUpload) {
      const result = await uploadMerchantMedia(file, folder);
      if ("error" in result) {
        setError(result.error);
        continue;
      }
      if (productId) {
        const attachResult = await attachProductImageAction(productId, result.url, images.length);
        if (attachResult.error) {
          setError(attachResult.error);
          continue;
        }
      }
      setImages((prev) => [...prev, { url: result.url }]);
    }
    setUploading(false);
  }

  async function handleRemove(index: number) {
    const image = images[index];
    if (productId && image.id) {
      await deleteProductImageAction(productId, image.id);
    }
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {images.map((image, index) => (
          <div key={image.id ?? image.url} className="relative h-20 w-20 flex-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt="" className="h-full w-full rounded-xl object-cover" />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              aria-label={t.seller.removePhotoLabel}
              className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-charcoal text-white shadow-sm"
            >
              <X size={13} />
            </button>
            {/* Deferred mode: the form itself reads these on submit. */}
            {!productId && <input type="hidden" name="imageUrl" value={image.url} />}
          </div>
        ))}

        {images.length < max && (
          <label className="flex h-20 w-20 flex-none cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-charcoal/15 text-charcoal-faint active:bg-charcoal/[0.03]">
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
            <span className="text-[10px] font-medium">
              {uploading ? t.seller.uploadingPhoto : t.seller.addPhotosCta}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              multiple
              capture="environment"
              className="hidden"
              disabled={uploading}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        )}
      </div>
      {error && <p className="text-[12px] font-medium text-red-600">{error}</p>}
    </div>
  );
}
