import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/marketplace/types";
import type { PreferenceSource, TasteDimension, TastePreference } from "@/lib/marketplace/taste/types";

export async function getTastePreferences(userId: string): Promise<TastePreference[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("taste_preferences")
    .select("dimension, value, weight, source")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as TastePreference[];
}

/**
 * Full replace of the user's EXPLICIT category picks — onboarding and the
 * "edit your interests" screen in Account both call this with whatever is
 * currently selected, so unchecking a category actually removes it rather
 * than only ever adding new ones. Inferred rows for the same categories
 * are untouched (explicit and inferred are separate rows by design — see
 * the migration's header comment).
 */
export async function setExplicitCategoryPreferences(userId: string, categories: Category[]): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const { error: deleteError } = await supabase
    .from("taste_preferences")
    .delete()
    .eq("user_id", userId)
    .eq("dimension", "category")
    .eq("source", "explicit");
  if (deleteError) throw deleteError;

  if (categories.length === 0) return;

  const rows = categories.map((value) => ({
    user_id: userId,
    dimension: "category" as const,
    value,
    source: "explicit" as const,
    weight: 1,
  }));
  const { error: insertError } = await supabase.from("taste_preferences").insert(rows);
  if (insertError) throw insertError;
}

/**
 * Best-effort, additive inferred-signal write — goes through the
 * increment_taste_weight RPC (0003_taste_profile.sql) so concurrent events
 * accumulate weight atomically instead of racing on a read-then-write.
 * Callers treat failures as non-fatal (see interactions.ts): a dropped
 * inferred signal degrades personalization, it never breaks browsing.
 */
export async function recordInferredSignal(
  userId: string,
  dimension: TasteDimension,
  value: string,
  weightDelta: number,
  source: PreferenceSource = "inferred",
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("increment_taste_weight", {
    p_user_id: userId,
    p_dimension: dimension,
    p_value: value,
    p_source: source,
    p_delta: weightDelta,
  });
  if (error) throw error;
}

export async function markTasteOnboardingCompleted(userId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ taste_onboarding_completed_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
}
