"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRequestOrigin } from "@/lib/request-origin";
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

/** name/message only — never the full error object (it can carry request/response internals), never a key/token/cookie. */
function describeError(e: unknown): { name: string; message: string } {
  if (e instanceof Error) return { name: e.name, message: e.message };
  return { name: typeof e, message: String(e) };
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
    const origin = await getRequestOrigin();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // Vercel Preview URLs change on every deploy, so this can never be a
      // fixed string — see getRequestOrigin()'s docstring. app/auth/callback
      // is what exchanges the email link for a real session before landing
      // on /onboarding.
      options: { emailRedirectTo: `${origin}/auth/callback?next=/onboarding` },
    });
    if (error) {
      console.error("[signUpAction] signUp error", { status: error.status, code: error.code, message: error.message });
      return { error: mapAuthError(error.message) };
    }
    needsEmailConfirmation = !data.session;
  } catch (e) {
    console.error("[signUpAction] unexpected error", describeError(e));
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
