"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { setExplicitCategoryPreferences, markTasteOnboardingCompleted } from "@/lib/marketplace/taste/queries";
import type { Category } from "@/lib/marketplace/types";

const VALID_CATEGORIES: readonly Category[] = [
  "squishies",
  "collectibles",
  "pets",
  "beauty",
  "fashion",
  "home",
  "tech",
  "gifts",
  "viral",
];

function isCategory(value: string): value is Category {
  return (VALID_CATEGORIES as readonly string[]).includes(value);
}

function safeRedirectTarget(formData: FormData): string {
  const target = String(formData.get("redirectTo") ?? "/");
  // Only ever redirect within the app — a form field is client-controlled.
  return target.startsWith("/") ? target : "/";
}

/**
 * "Guardar" — replaces the user's explicit category picks with whatever is
 * currently checked (see setExplicitCategoryPreferences: a full replace,
 * not additive, so unchecking something actually removes it) and marks
 * onboarding as seen. An empty selection is valid — the onboarding brief
 * requires no minimum.
 */
export async function saveOnboardingAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/account");

  const categories = formData.getAll("category").map(String).filter(isCategory);
  try {
    await setExplicitCategoryPreferences(user.id, categories);
    await markTasteOnboardingCompleted(user.id);
  } catch {
    // Onboarding is explicitly optional/best-effort (Phase 7 Section 6) —
    // a Supabase hiccup here should feel like a skip, never strand the
    // user on an error page for a step they could've skipped anyway.
  }

  redirect(safeRedirectTarget(formData));
}

/** "Omitir" — marks onboarding as seen without touching taste_preferences at all. */
export async function skipOnboardingAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/account");

  try {
    await markTasteOnboardingCompleted(user.id);
  } catch {
    // Same fail-quiet rule as saveOnboardingAction above.
  }
  redirect(safeRedirectTarget(formData));
}
