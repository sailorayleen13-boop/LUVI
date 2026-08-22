import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getTastePreferences } from "@/lib/marketplace/taste/queries";
import { OnboardingView } from "@/components/onboarding/onboarding-view";
import type { Aesthetic, Interest } from "@/lib/marketplace/types";

/**
 * Reached right after sign-up (see signUpAction) in "create" mode, and
 * again from Account's "Tus gustos" → Editar link in "edit" mode (same
 * page, same component — Taste Profile Section 7 explicitly rules out a
 * second signup-like flow just to change picks later). Requires a session
 * (taste_preferences.user_id has no meaning for an anonymous visitor);
 * bounces to /account rather than erroring if reached directly without one.
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; mode?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/account");

  const { redirectTo, mode } = await searchParams;
  let initialInterests: Interest[] = [];
  let initialAesthetics: Aesthetic[] = [];
  try {
    const preferences = await getTastePreferences(user.id);
    initialInterests = preferences
      .filter((p) => p.dimension === "interest" && p.source === "explicit")
      .map((p) => p.value as Interest);
    initialAesthetics = preferences
      .filter((p) => p.dimension === "aesthetic" && p.source === "explicit")
      .map((p) => p.value as Aesthetic);
  } catch {
    // Falls back to an empty (unchecked) grid — still fully usable, see
    // saveOnboardingAction's own fail-quiet handling for the write side.
  }

  return (
    <OnboardingView
      initialInterests={initialInterests}
      initialAesthetics={initialAesthetics}
      redirectTo={redirectTo ?? "/"}
      mode={mode === "edit" ? "edit" : "create"}
    />
  );
}
