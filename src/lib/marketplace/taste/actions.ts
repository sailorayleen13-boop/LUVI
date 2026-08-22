"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import {
  markTasteOnboardingCompleted,
  markTasteOnboardingSkipped,
  setExplicitPreferences,
} from "@/lib/marketplace/taste/queries";
import { AESTHETIC_VALUES, INTEREST_VALUES, type Aesthetic, type Interest } from "@/lib/marketplace/types";

function isInterest(value: string): value is Interest {
  return (INTEREST_VALUES as readonly string[]).includes(value);
}

function isAesthetic(value: string): value is Aesthetic {
  return (AESTHETIC_VALUES as readonly string[]).includes(value);
}

function safeRedirectTarget(formData: FormData): string {
  const target = String(formData.get("redirectTo") ?? "/");
  // Only ever redirect within the app — a form field is client-controlled.
  return target.startsWith("/") ? target : "/";
}

/**
 * "Guardar" — replaces the user's explicit interest AND aesthetic picks
 * with whatever the onboarding flow (or Account's "Tus gustos" edit
 * screen) currently has selected. A full replace per dimension (see
 * setExplicitPreferences), not additive, so unchecking something actually
 * removes it. The minimum-5-interests rule is enforced in the UI
 * (OnboardingView won't let you reach this submit with fewer selected) —
 * this action itself doesn't re-reject a short list, matching the rest of
 * onboarding's fail-quiet posture: there's no good recoverable UX for
 * bouncing a completed form back at someone, so if fewer arrive anyway
 * (e.g. JS disabled), they're saved as-is rather than the whole save
 * failing outright.
 */
export async function saveOnboardingAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/account");

  const interests = formData.getAll("interest").map(String).filter(isInterest);
  const aesthetics = formData.getAll("aesthetic").map(String).filter(isAesthetic);
  try {
    await setExplicitPreferences(user.id, "interest", interests);
    await setExplicitPreferences(user.id, "aesthetic", aesthetics);
    await markTasteOnboardingCompleted(user.id);
  } catch {
    // Onboarding is explicitly optional/best-effort (Phase 7 Section 6) —
    // a Supabase hiccup here should feel like a skip, never strand the
    // user on an error page for a step they could've skipped anyway.
  }

  redirect(safeRedirectTarget(formData));
}

/**
 * "Omitir" — marks onboarding as SKIPPED (not completed — see
 * markTasteOnboardingSkipped's docstring) without touching
 * taste_preferences at all.
 */
export async function skipOnboardingAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/account");

  try {
    await markTasteOnboardingSkipped(user.id);
  } catch {
    // Same fail-quiet rule as saveOnboardingAction above.
  }
  redirect(safeRedirectTarget(formData));
}
