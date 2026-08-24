"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Direct browser-to-Storage upload — the one deliberate exception to "every
 * write goes through a Server Action" in this codebase. The raw file bytes
 * go straight to the `merchant-media` bucket (Storage RLS enforces
 * ownership via is_merchant_media_owner() in 0004_merchant_media.sql,
 * keyed off the merchantId path segment below); the resulting public URL is
 * then handed to a Server Action (attachProductImageAction /
 * createQuickProductAction / updateStoreAction's logo field) to be recorded
 * against a product/merchant row. Uploading through a Server Action instead
 * would mean base64-encoding photos through the Next.js server for no
 * benefit — RLS already does the real access control here.
 *
 * Limits mirror the bucket's own file_size_limit/allowed_mime_types so a
 * seller gets a friendly Spanish message immediately instead of a raw
 * Storage error after the upload attempt.
 */
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export type UploadResult = { url: string } | { error: string };

function extensionFor(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  const fromType = file.type.split("/").pop();
  return fromType || "jpg";
}

export function validateMerchantMediaFile(file: File): string | undefined {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Ese archivo no es una imagen compatible. Usá JPG, PNG, WEBP o HEIC.";
  }
  if (file.size > MAX_BYTES) {
    return "La imagen es muy pesada. El máximo es 5 MB.";
  }
  return undefined;
}

/**
 * `folder` is either the merchant's id (store logo, product photos before a
 * product id exists yet — Quick Publish) or `${merchantId}/${productId}`
 * (photos added while editing an existing product) — either way the FIRST
 * path segment is always the merchant id, which is all
 * is_merchant_media_owner() checks.
 */
export async function uploadMerchantMedia(file: File, folder: string): Promise<UploadResult> {
  const validationError = validateMerchantMediaFile(file);
  if (validationError) return { error: validationError };

  const supabase = createSupabaseBrowserClient();
  const path = `${folder}/${crypto.randomUUID()}.${extensionFor(file)}`;

  const { error } = await supabase.storage.from("merchant-media").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    return { error: "No pudimos subir la foto. Revisá tu conexión e intentá de nuevo." };
  }

  const { data } = supabase.storage.from("merchant-media").getPublicUrl(path);
  return { url: data.publicUrl };
}
