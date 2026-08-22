"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseUrl } from "@/lib/supabase/env";
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

/**
 * DEBUG-ONLY diagnostic (see the "/rest/v1/auth/v1/signup" gateway-log
 * investigation): reports enough about the configured Supabase URL to spot
 * a misconfigured env var — hostname, and whether the pathname is empty (as
 * it should be, e.g. NEXT_PUBLIC_SUPABASE_URL="https://xxxx.supabase.co")
 * or already contains "/rest/v1" (the misconfiguration that would explain
 * the doubled-up gateway paths: the @supabase/ssr client always appends its
 * own "/auth/v1"/"/rest/v1" to whatever base URL it's given, so a base URL
 * that already ends in "/rest/v1" produces exactly "/rest/v1/auth/v1/..."
 * and "/rest/v1/rest/v1/..." — never logs the URL itself, just this shape.
 */
function diagnoseSupabaseUrl(): { hostname: string; pathnameIsEmpty: boolean; pathnameHasRestV1: boolean } {
  try {
    const parsed = new URL(getSupabaseUrl());
    const pathname = parsed.pathname === "/" ? "" : parsed.pathname;
    return {
      hostname: parsed.hostname,
      pathnameIsEmpty: pathname === "",
      pathnameHasRestV1: pathname.includes("/rest/v1"),
    };
  } catch {
    return { hostname: "<unparseable>", pathnameIsEmpty: false, pathnameHasRestV1: false };
  }
}

/** Name/message only — never the error object itself (it can carry request/response internals). */
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
    console.log("[signUpAction] supabase url diagnostic", diagnoseSupabaseUrl());

    const supabase = await createSupabaseServerClient();
    console.log("[signUpAction] createSupabaseServerClient() succeeded");

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      console.error("[signUpAction] supabase.auth.signUp() returned an error", {
        status: error.status,
        code: error.code,
        message: error.message,
      });
      return { error: mapAuthError(error.message) };
    }
    needsEmailConfirmation = !data.session;
  } catch (e) {
    console.error("[signUpAction] caught exception", describeError(e));
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
