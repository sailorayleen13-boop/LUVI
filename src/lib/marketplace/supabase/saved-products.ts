import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Decision 2 (Phase 5 corrections): saved_products is authenticated-only.
 * Anonymous saves stay in localStorage (src/lib/store/wishlist-context.tsx,
 * key "luvi:wishlist") for as long as the user has no account. This module
 * is what a future first-login flow calls with that local list — purely
 * additive, never destructive: existing server-side saves are untouched,
 * and ids already saved are silently skipped rather than erroring.
 *
 * Not called from anywhere yet — no auth UI exists to trigger a login. This
 * exists so the merge behavior Decision 2 requires has a concrete,
 * ready-to-call home once sign-in lands.
 */
export async function mergeLocalSavedProducts(userId: string, localProductIds: string[]): Promise<void> {
  if (localProductIds.length === 0) return;
  const supabase = await createSupabaseServerClient();
  const rows = localProductIds.map((productId) => ({ user_id: userId, product_id: productId }));
  const { error } = await supabase
    .from("saved_products")
    .upsert(rows, { onConflict: "user_id,product_id", ignoreDuplicates: true });
  if (error) throw error;
}

export async function getSavedProductIds(userId: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("saved_products")
    .select("product_id")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.product_id);
}

export async function saveProduct(userId: string, productId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("saved_products")
    .upsert({ user_id: userId, product_id: productId }, { onConflict: "user_id,product_id", ignoreDuplicates: true });
  if (error) throw error;
}

export async function unsaveProduct(userId: string, productId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("saved_products")
    .delete()
    .eq("user_id", userId)
    .eq("product_id", productId);
  if (error) throw error;
}
