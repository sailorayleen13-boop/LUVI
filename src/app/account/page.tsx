import Link from "next/link";
import { ChevronRight, Heart, LogOut, Sparkles } from "lucide-react";
import { getCurrentUserWithProfile } from "@/lib/auth/session";
import { signOutAction } from "@/lib/auth/actions";
import { AuthPanel } from "@/components/account/auth-panel";
import { TabHeader } from "@/components/marketplace/tab-header";
import { t } from "@/lib/i18n";

/**
 * Simple, functional account experience (Phase 7 Section 15) — not a
 * merchant dashboard, not a registration form. Anonymous visitors get a
 * compact sign-up/sign-in panel; authenticated users get identity +
 * shortcuts to Saved and taste preferences + sign out. Server Component:
 * auth state is read once via the session cookie (getCurrentUserWithProfile),
 * no client-side flash between "checking" and "signed in".
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

        <Link
          href="/onboarding?redirectTo=/account"
          className="flex items-center gap-3 rounded-2xl border border-charcoal/8 p-4 transition-colors hover:bg-charcoal/[0.03] active:bg-charcoal/[0.03]"
        >
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-fucsia-light">
            <Sparkles size={16} className="text-fucsia-dark" />
          </span>
          <span className="flex-1 text-[14px] font-medium text-charcoal">{t.account.preferencesLink}</span>
          <ChevronRight size={16} className="text-charcoal-faint" />
        </Link>

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
