import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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
 * Full replace of the user's EXPLICIT picks for one dimension — onboarding
 * and Account's "Tus gustos" both call this once per dimension (interest,
 * then aesthetic) with whatever is currently selected, so unchecking a
 * value actually removes it rather than only ever adding new ones.
 * INFERRED rows for the same dimension+value are untouched (explicit and
 * inferred are separate rows by design — see the migration's header
 * comment) — editing your explicit picks never erases what your behavior
 * already taught LUVI, and vice versa.
 *
 * Dimension-agnostic on purpose: this used to be
 * setExplicitCategoryPreferences(userId, categories), written back when
 * "category" was the only explicit dimension onboarding collected. Now
 * that interest/aesthetic are the explicit dimensions (category/merchant
 * are inferred-only), one generic function serves both without
 * duplicating the delete-then-insert logic per dimension.
 */
export async function setExplicitPreferences(
  userId: string,
  dimension: TasteDimension,
  values: string[],
): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const { error: deleteError } = await supabase
    .from("taste_preferences")
    .delete()
    .eq("user_id", userId)
    .eq("dimension", dimension)
    .eq("source", "explicit");
  if (deleteError) throw deleteError;

  if (values.length === 0) return;

  const rows = values.map((value) => ({
    user_id: userId,
    dimension,
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

/**
 * Distinct from markTasteOnboardingCompleted — see 0003_taste_profile.sql's
 * header comment for why the two columns are kept separate rather than one
 * "onboarding was seen" timestamp: this lets a later, deliberate touchpoint
 * (not built in this pass) offer to finish the Taste Profile specifically
 * to someone who skipped, without conflating that with someone who already
 * completed it.
 */
export async function markTasteOnboardingSkipped(userId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ taste_onboarding_skipped_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
}
