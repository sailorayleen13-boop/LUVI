"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import {
  addProductImage,
  archiveProduct,
  createProduct,
  createStore,
  deleteProductImage,
  getOwnedMerchant,
  getOwnedProductById,
  MerchantWriteError,
  setProductAvailability,
  updateProduct,
  updateStore,
  type ProductInput,
} from "@/lib/marketplace/supabase/merchant-repository";
import { CATEGORY_EMOJI } from "@/lib/marketplace/category-visuals";
import type { Category, MerchantAvailability, Product } from "@/lib/marketplace/types";

/**
 * The merchant-write Server Action boundary — every mutation a seller can
 * make goes through one of these. Each action resolves the current user
 * from the session (never a client-supplied id) and, for anything scoped to
 * an existing store/product, re-fetches ownership through
 * merchant-repository.ts (which itself relies on RLS: a mismatched
 * merchantId/productId simply reads/writes nothing rather than someone
 * else's data — see 0002_rls.sql's is_merchant_member-scoped policies).
 * Errors surface as a friendly Spanish string return value, not a thrown
 * exception — these back plain <form action> submits, so there is no
 * client-side try/catch to route a thrown error into.
 */

export interface ActionResult {
  error?: string;
}

const AVAILABILITY_VALUES: MerchantAvailability[] = ["IN_STOCK", "PREORDER", "COMING_SOON", "SOLD_OUT"];
const CATEGORY_VALUES = Object.keys(CATEGORY_EMOJI) as Category[];

function isCategory(value: string): value is Category {
  return (CATEGORY_VALUES as string[]).includes(value);
}

function isAvailability(value: string): value is MerchantAvailability {
  return (AVAILABILITY_VALUES as string[]).includes(value);
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function num(formData: FormData, key: string): number | undefined {
  const value = str(formData, key);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * At least one way to reach the seller — same rule Section 4/19 requires
 * before a store or a published product goes live. WhatsApp is loosely
 * validated (digits, optionally with a leading +), Instagram/website just
 * need to be non-empty; the wa.me/instagram.com URL shape is built here so
 * the seller only ever types a phone number or handle, never a URL.
 */
function hasContact(whatsapp: string, instagram: string, website: string): boolean {
  return Boolean(whatsapp || instagram || website);
}

function normalizeWhatsapp(input: string): string | undefined {
  const digits = input.replace(/[^0-9]/g, "");
  if (!digits) return undefined;
  return `https://wa.me/${digits}`;
}

function normalizeInstagram(input: string): string | undefined {
  const handle = input.trim().replace(/^@/, "");
  if (!handle) return undefined;
  if (handle.startsWith("http://") || handle.startsWith("https://")) return handle;
  return `https://instagram.com/${handle}`;
}

function normalizeWebsite(input: string): string | undefined {
  const value = input.trim();
  if (!value) return undefined;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `https://${value}`;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export async function createStoreAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/account");

  const name = str(formData, "name");
  const region = str(formData, "region");
  const city = str(formData, "city");
  const addressOptional = str(formData, "addressOptional");
  const whatsapp = str(formData, "whatsapp");
  const instagram = str(formData, "instagram");
  const website = str(formData, "website");
  const logo = str(formData, "logo");

  if (!name) return { error: "Contanos cómo se llama tu negocio." };
  if (!hasContact(whatsapp, instagram, website)) {
    return { error: "Agregá al menos una forma de contacto: WhatsApp, Instagram o sitio web." };
  }

  const existing = await getOwnedMerchant(user.id).catch(() => null);
  if (existing) redirect("/merchant");

  try {
    await createStore(user.id, {
      name,
      region: region || undefined,
      city: city || undefined,
      addressOptional: addressOptional || undefined,
      whatsapp: normalizeWhatsapp(whatsapp),
      instagram: normalizeInstagram(instagram),
      website: normalizeWebsite(website),
      logo: logo || undefined,
    });
  } catch (err) {
    // TEMPORARY diagnostic (round 3): the same PERMISSION_DENIED category
    // is still coming back even after 0007's SECURITY DEFINER fix, so this
    // now also surfaces WHICH permission (RPC EXECUTE vs. the auth schema
    // vs. a specific table) and WHICH leg of the flow it failed on — see
    // refinePermissionTarget()/CreateStoreStage in merchant-repository.ts.
    // Only fixed, sanitized category/stage names ever land here — never a
    // message, code, table/column name, user id, or anything else
    // DB-internal. Revert to the plain friendly message once the real
    // cause is confirmed fixed.
    const category = err instanceof MerchantWriteError ? err.category : "UNKNOWN_DB_ERROR";
    const stage = err instanceof MerchantWriteError ? err.stage : "UNEXPECTED";
    return { error: `No pudimos crear tu tienda. Código: ${category} · Etapa: ${stage}` };
  }

  redirect("/merchant/products/new");
}

export async function updateStoreAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/account");
  const merchant = await getOwnedMerchant(user.id).catch(() => null);
  if (!merchant) redirect("/sell");

  const name = str(formData, "name");
  if (!name) return { error: "El nombre de tu tienda no puede quedar vacío." };

  const whatsapp = str(formData, "whatsapp");
  const instagram = str(formData, "instagram");
  const website = str(formData, "website");
  if (!hasContact(whatsapp, instagram, website)) {
    return { error: "Agregá al menos una forma de contacto: WhatsApp, Instagram o sitio web." };
  }

  try {
    await updateStore(merchant.id, {
      name,
      region: str(formData, "region") || undefined,
      city: str(formData, "city") || undefined,
      addressOptional: str(formData, "addressOptional") || undefined,
      whatsapp: normalizeWhatsapp(whatsapp),
      instagram: normalizeInstagram(instagram),
      website: normalizeWebsite(website),
      logo: str(formData, "logo") || undefined,
    });
  } catch {
    return { error: "No pudimos guardar los cambios. Intentá de nuevo." };
  }

  revalidatePath("/merchant");
  revalidatePath("/merchant/settings");
  revalidatePath(`/m/${merchant.slug}`);
  redirect("/merchant");
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

function readProductInput(formData: FormData): ProductInput {
  const category = str(formData, "category");
  const availability = str(formData, "availability");
  const productWhatsapp = str(formData, "whatsappUrl");
  const productInstagram = str(formData, "instagramUrl");
  return {
    name: str(formData, "name"),
    description: str(formData, "description") || undefined,
    category: isCategory(category) ? category : "gifts",
    price: num(formData, "price") ?? 0,
    originalPrice: num(formData, "originalPrice"),
    availability: isAvailability(availability) ? availability : "IN_STOCK",
    deliveryEstimate: str(formData, "deliveryEstimate") || undefined,
    externalPurchaseUrl: str(formData, "externalPurchaseUrl") || undefined,
    // Product-level contact override, falling back to the store's when left
    // blank — resolvePurchaseUrl() already implements this priority on the
    // read side (Section 16); this just decides what gets stored.
    whatsappUrl: productWhatsapp ? normalizeWhatsapp(productWhatsapp) : undefined,
    instagramUrl: productInstagram ? normalizeInstagram(productInstagram) : undefined,
  };
}

/**
 * Publicación rápida — Section 5(A). Photos are uploaded straight to
 * Storage client-side (upload.ts) before this submits; their public URLs
 * ride along as repeated "imageUrl" fields and get attached here, after the
 * product row (and therefore its id) exists.
 */
export async function createQuickProductAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/account");
  const merchant = await getOwnedMerchant(user.id).catch(() => null);
  if (!merchant) redirect("/sell");

  const name = str(formData, "name");
  const price = num(formData, "price");
  if (!name) return { error: "Ponele un nombre a tu producto." };
  if (price === undefined || price <= 0) return { error: "El precio tiene que ser mayor a cero." };

  const category = str(formData, "category");
  const imageUrls = formData.getAll("imageUrl").map(String).filter(Boolean);

  let product: Product;
  try {
    product = await createProduct(
      merchant.id,
      {
        name,
        price,
        category: isCategory(category) ? category : "gifts",
        availability: "IN_STOCK",
      },
      false,
    );
    await Promise.all(imageUrls.map((url, position) => addProductImage(product.id, url, position)));
  } catch {
    return { error: "No pudimos publicar tu producto. Intentá de nuevo." };
  }

  revalidatePath("/merchant");
  redirect(`/merchant/products/${product.id}/edit?published=1`);
}

async function requireOwnedProduct(userId: string, productId: string) {
  const merchant = await getOwnedMerchant(userId);
  if (!merchant) redirect("/sell");
  const product = await getOwnedProductById(productId);
  if (!product || product.merchantId !== merchant.id) redirect("/merchant");
  return { merchant, product };
}

/** Crear publicación completa (Section 5B) and edits both land here — same form, same action, isDraft carried through from a hidden field. */
export async function saveProductAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/account");
  const merchant = await getOwnedMerchant(user.id).catch(() => null);
  if (!merchant) redirect("/sell");

  const productId = str(formData, "productId");
  const publish = str(formData, "publish") === "1";
  const input = readProductInput(formData);

  if (!input.name) return { error: "Ponele un nombre a tu producto." };
  if (publish && (!input.price || input.price <= 0)) {
    return { error: "El precio tiene que ser mayor a cero." };
  }
  if (publish && !hasContact(input.whatsappUrl ?? "", input.instagramUrl ?? "", "")) {
    // A product only needs SOME way to reach a buyer to go public — the
    // store's own contact info already covers this by default (Section 16),
    // so this only blocks when both the product AND the store lack one.
    if (!hasContact(merchant.whatsapp ?? "", merchant.instagram ?? "", merchant.website ?? "")) {
      return { error: "Tu tienda necesita al menos un contacto antes de publicar (WhatsApp, Instagram o sitio web)." };
    }
  }

  try {
    if (productId) {
      const { product } = await requireOwnedProduct(user.id, productId);
      await updateProduct(product.id, { ...input, isDraft: !publish });
      revalidatePath("/merchant");
      redirect(publish ? "/merchant" : `/merchant/products/${product.id}/edit`);
    } else {
      const product = await createProduct(merchant.id, input, !publish);
      const imageUrls = formData.getAll("imageUrl").map(String).filter(Boolean);
      await Promise.all(imageUrls.map((url, position) => addProductImage(product.id, url, position)));
      revalidatePath("/merchant");
      redirect(publish ? "/merchant" : `/merchant/products/${product.id}/edit`);
    }
  } catch (err) {
    // redirect() throws internally — let that continue propagating.
    if (err && typeof err === "object" && "digest" in err) throw err;
    return { error: "No pudimos guardar tu producto. Intentá de nuevo." };
  }
}

export async function setProductAvailabilityAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/account");
  const productId = str(formData, "productId");
  const availability = str(formData, "availability");
  if (!productId || !isAvailability(availability)) return;
  const { product } = await requireOwnedProduct(user.id, productId);
  await setProductAvailability(product.id, availability).catch(() => {});
  revalidatePath("/merchant");
}

export async function archiveProductAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/account");
  const productId = str(formData, "productId");
  if (!productId) return;
  const { product } = await requireOwnedProduct(user.id, productId);
  await archiveProduct(product.id).catch(() => {});
  revalidatePath("/merchant");
}

// ---------------------------------------------------------------------------
// Product images — the file itself goes straight from the browser to
// Supabase Storage (see supabase/upload.ts); this action only records the
// resulting public URL against the product row, after re-verifying
// ownership server-side.
// ---------------------------------------------------------------------------

export async function attachProductImageAction(
  productId: string,
  url: string,
  position: number,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Iniciá sesión de nuevo para continuar." };
  try {
    await requireOwnedProduct(user.id, productId);
    await addProductImage(productId, url, position);
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    return { error: "No pudimos guardar la foto. Intentá de nuevo." };
  }
  revalidatePath("/merchant");
  return {};
}

export async function deleteProductImageAction(productId: string, imageId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Iniciá sesión de nuevo para continuar." };
  try {
    await requireOwnedProduct(user.id, productId);
    await deleteProductImage(imageId);
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    return { error: "No pudimos borrar la foto. Intentá de nuevo." };
  }
  revalidatePath("/merchant");
  return {};
}
