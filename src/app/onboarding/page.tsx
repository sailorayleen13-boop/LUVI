import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getTastePreferences } from "@/lib/marketplace/taste/queries";
import { OnboardingView } from "@/components/onboarding/onboarding-view";
import type { Category } from "@/lib/marketplace/types";

/**
 * Reached right after sign-up (see signUpAction), and again from Account's
 * "Tus intereses" link to revisit picks later (Phase 7 Section 16) — same
 * page either way, just pre-filled with whatever is currently explicit.
 * Requires a session (taste_preferences.user_id has no meaning for an
 * anonymous visitor); bounces to /account rather than erroring if reached
 * directly without one.
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/account");

  const { redirectTo } = await searchParams;
  let initialSelected: Category[] = [];
  try {
    const preferences = await getTastePreferences(user.id);
    initialSelected = preferences
      .filter((p) => p.dimension === "category" && p.source === "explicit")
      .map((p) => p.value as Category);
  } catch {
    // Falls back to an empty (unchecked) grid — still fully usable, see
    // saveOnboardingAction's own fail-quiet handling for the write side.
  }

  return <OnboardingView initialSelected={initialSelected} redirectTo={redirectTo ?? "/"} />;
}
