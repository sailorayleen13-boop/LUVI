"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { t } from "@/lib/i18n";

export interface AuthActionState {
  error: string | null;
  needsEmailConfirmation?: boolean;
}

function mapAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) return t.auth.errorInvalidCredentials;
  if (lower.includes("already registered") || lower.includes("already exists")) return t.auth.errorEmailInUse;
  if (lower.includes("password") && lower.includes("least")) return t.auth.errorWeakPassword;
  return t.auth.errorGeneric;
}

export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: t.auth.errorGeneric };

  // Only the Supabase call is guarded — redirect() throws a special
  // control-flow error that must propagate, never be caught here.
  let needsEmailConfirmation: boolean;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: mapAuthError(error.message) };
    needsEmailConfirmation = !data.session;
  } catch {
    return { error: t.auth.errorGeneric };
  }

  // Whether this needs email confirmation depends on the Supabase project's
  // auth settings, which this codebase doesn't control — handle both
  // outcomes rather than assuming one (see Phase 7's fail-gracefully rule).
  if (needsEmailConfirmation) return { error: null, needsEmailConfirmation: true };

  redirect("/onboarding");
}

export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: t.auth.errorGeneric };

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: mapAuthError(error.message) };
  } catch {
    return { error: t.auth.errorGeneric };
  }

  redirect("/account");
}

export async function signOutAction(): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // Nothing meaningful to recover into — still send them home signed-out
    // from the app's point of view even if the Supabase call itself failed.
  }
  redirect("/");
}
