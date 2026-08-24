import Link from "next/link";
import { ChevronRight, Heart, LogOut, Sparkles } from "lucide-react";
import { getCurrentUserWithProfile } from "@/lib/auth/session";
import { signOutAction } from "@/lib/auth/actions";
import { getTastePreferences } from "@/lib/marketplace/taste/queries";
import { AuthPanel } from "@/components/account/auth-panel";
import { TabHeader } from "@/components/marketplace/tab-header";
import { t } from "@/lib/i18n";
import type { Aesthetic, Interest } from "@/lib/marketplace/types";

/**
 * Simple, functional account experience (Phase 7 Section 15) — not a
 * merchant dashboard, not a registration form. Anonymous visitors get a
 * compact sign-up/sign-in panel; authenticated users get identity, "Tus
 * gustos" (explicit interests/aesthetics, editable without repeating
 * signup — Taste Profile Section 7), a shortcut to Saved, and sign out.
 * Server Component: auth state and preferences are read once via the
 * session cookie, no client-side flash between "checking" and "signed in".
 */
export default async function AccountPage() {
  const session = await getCurrentUserWithProfile();

  if (!session) {
    return (
      <>
        <TabHeader title={t.account.heading} />
        <div className="flex flex-col gap-5 px-4 pb-8">
          <div className="flex flex-col items-center gap-1.5 pt-2 text-center">
            <p className="font-display text-lg font-semibold text-charcoal">{t.account.anonymousTitle}</p>
            <p className="text-sm text-charcoal-faint">{t.account.anonymousSubtitle}</p>
          </div>
          <AuthPanel />
        </div>
      </>
    );
  }

  const { user, profile } = session;
  const displayName = profile?.display_name || user.email;

  let interests: Interest[] = [];
  let aesthetics: Aesthetic[] = [];
  try {
    const preferences = await getTastePreferences(user.id);
    interests = preferences
      .filter((p) => p.dimension === "interest" && p.source === "explicit")
      .map((p) => p.value as Interest);
    aesthetics = preferences
      .filter((p) => p.dimension === "aesthetic" && p.source === "explicit")
      .map((p) => p.value as Aesthetic);
  } catch {
    // Taste Profile is additive, never load-bearing for the account page —
    // a failed read just shows the empty ("elegí tus gustos") state below.
  }
  const hasTasteProfile = interests.length > 0 || aesthetics.length > 0;

  return (
    <>
      <TabHeader title={t.account.heading} />
      <div className="flex flex-col gap-3 px-4 pb-8">
        <div className="flex items-center gap-3 rounded-2xl border border-charcoal/8 p-4">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-fucsia-light text-lg font-semibold text-fucsia-dark">
            {(displayName ?? "?").slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11.5px] text-charcoal-faint">{t.account.signedInAs}</p>
            <p className="truncate text-[14px] font-semibold text-charcoal">{displayName}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-charcoal/8 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-fucsia-light">
                <Sparkles size={16} className="text-fucsia-dark" />
              </span>
              <span className="text-[14px] font-semibold text-charcoal">{t.account.tasteHeading}</span>
            </div>
            <Link
              href={`/onboarding?mode=${hasTasteProfile ? "edit" : "create"}&redirectTo=/account`}
              className="text-[13px] font-semibold text-fucsia-dark"
            >
              {hasTasteProfile ? t.account.tasteEditCta : t.account.tasteStartCta}
            </Link>
          </div>

          {hasTasteProfile ? (
            <div className="flex flex-col gap-2">
              {interests.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-charcoal-faint">
                    {t.account.tasteInterestsLabel}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {interests.map((value) => (
                      <span
                        key={value}
                        className="rounded-full bg-fucsia-light px-3 py-1 text-[12px] font-medium text-fucsia-dark"
                      >
                        {t.interest[value]}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {aesthetics.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-charcoal-faint">
                    {t.account.tasteAestheticsLabel}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {aesthetics.map((value) => (
                      <span
                        key={value}
                        className="rounded-full bg-cream-soft px-3 py-1 text-[12px] font-medium text-charcoal-soft"
                      >
                        {t.aesthetic[value]}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[13px] text-charcoal-faint">{t.account.tasteEmptyState}</p>
          )}
        </div>

        <Link
          href="/saved"
          className="flex items-center gap-3 rounded-2xl border border-charcoal/8 p-4 transition-colors hover:bg-charcoal/[0.03] active:bg-charcoal/[0.03]"
        >
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-fucsia-light">
            <Heart size={16} className="text-fucsia-dark" />
          </span>
          <span className="flex-1 text-[14px] font-medium text-charcoal">{t.account.savedLink}</span>
          <ChevronRight size={16} className="text-charcoal-faint" />
        </Link>

        <form action={signOutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-2xl border border-charcoal/8 p-4 text-left transition-colors hover:bg-charcoal/[0.03] active:bg-charcoal/[0.03]"
          >
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-charcoal/5">
              <LogOut size={16} className="text-charcoal-soft" />
            </span>
            <span className="flex-1 text-[14px] font-medium text-charcoal">{t.account.signOut}</span>
          </button>
        </form>
      </div>
    </>
  );
}
