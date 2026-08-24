"use client";

import { useActionState, useState } from "react";
import { Mail } from "lucide-react";
import { signInAction, signUpAction, type AuthActionState } from "@/lib/auth/actions";
import { t } from "@/lib/i18n";

const INITIAL_STATE: AuthActionState = { error: null };

/**
 * Anonymous-state Account UI (Phase 7 Section 15): a compact sign-up/sign-in
 * form, not a dedicated auth page — browsing never routes through this,
 * it's only reached by a visitor who chose to open Account. Both forms use
 * React 19 Server Action form state (useActionState) directly against
 * src/lib/auth/actions.ts; no client-side Supabase call here at all.
 */
export function AuthPanel() {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [signUpState, signUpFormAction, signUpPending] = useActionState(signUpAction, INITIAL_STATE);
  const [signInState, signInFormAction, signInPending] = useActionState(signInAction, INITIAL_STATE);

  if (signUpState.needsEmailConfirmation) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-cream-soft px-5 py-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-fucsia-light">
          <Mail size={22} className="text-fucsia-dark" />
        </div>
        <p className="font-display text-base font-semibold text-charcoal">{t.auth.confirmEmailTitle}</p>
        <p className="text-sm text-charcoal-faint">{t.auth.confirmEmailSubtitle}</p>
      </div>
    );
  }

  const state = mode === "signup" ? signUpState : signInState;
  const action = mode === "signup" ? signUpFormAction : signInFormAction;
  const pending = mode === "signup" ? signUpPending : signInPending;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex rounded-full bg-cream-soft p-1">
        {(["signup", "signin"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMode(tab)}
            className={`flex-1 rounded-full py-2 text-[13px] font-semibold transition ${
              mode === tab ? "bg-fucsia text-white shadow-sm" : "text-charcoal-soft"
            }`}
          >
            {tab === "signup" ? t.auth.signUpTab : t.auth.signInTab}
          </button>
        ))}
      </div>

      <form action={action} className="flex flex-col gap-3">
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={t.auth.emailLabel}
          aria-label={t.auth.emailLabel}
          className="rounded-full bg-cream-soft px-4 py-2.5 text-[14px] text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-fucsia/40"
        />
        <input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          placeholder={t.auth.passwordLabel}
          aria-label={t.auth.passwordLabel}
          className="rounded-full bg-cream-soft px-4 py-2.5 text-[14px] text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-fucsia/40"
        />

        {state.error && <p className="px-1 text-[12.5px] font-medium text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="flex items-center justify-center rounded-full bg-fucsia py-3 text-[15px] font-semibold text-white shadow-md transition active:scale-[0.98] disabled:opacity-60"
        >
          {pending
            ? mode === "signup"
              ? t.auth.signingUp
              : t.auth.signingIn
            : mode === "signup"
              ? t.auth.signUpCta
              : t.auth.signInCta}
        </button>
      </form>

      <p className="text-center text-[12px] text-charcoal-faint">{t.auth.browseWithoutAccount}</p>
    </div>
  );
}
