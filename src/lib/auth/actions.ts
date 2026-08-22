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

/**
 * Name/message only, PLUS the same fields off `.cause` where present —
 * never the error object itself (it can carry request/response internals),
 * and every field read here is a plain string/number, never a header,
 * cookie, token, or key. Node's global fetch (undici) throws a bare
 * `TypeError: fetch failed` for network-level failures (DNS, TLS,
 * connection refused/reset, timeout) with the ACTUAL system error attached
 * as `.cause` — {code, errno, syscall, hostname, message}, e.g. `ENOTFOUND`/
 * `ECONNREFUSED`/`ETIMEDOUT`/`CERT_HAS_EXPIRED`. That's the piece this
 * investigation needs: supabase-js's own error wrapping (see
 * node_modules/@supabase/auth-js/dist/module/lib/fetch.js's
 * `AuthRetryableFetchError`) discards the original error entirely and
 * keeps only its `.message` string — which is exactly why the signUp()
 * error path only ever showed `message: "fetch failed"` with no cause of
 * its own. checkSupabaseHealth() below makes its own raw fetch specifically
 * so this function has an original, unwrapped error to inspect.
 */
function describeError(e: unknown): Record<string, unknown> {
  if (!(e instanceof Error)) return { name: typeof e, message: String(e) };
  const result: Record<string, unknown> = { name: e.name, message: e.message };
  const cause = e.cause;
  if (cause && typeof cause === "object") {
    const c = cause as Record<string, unknown>;
    if (typeof c.name === "string") result.causeName = c.name;
    if (typeof c.message === "string") result.causeMessage = c.message;
    if (typeof c.code === "string") result.causeCode = c.code;
    if (typeof c.errno === "number") result.causeErrno = c.errno;
    if (typeof c.syscall === "string") result.causeSyscall = c.syscall;
    if (typeof c.hostname === "string") result.causeHostname = c.hostname;
  }
  return result;
}

/**
 * TEMPORARY connectivity diagnostic — a raw, minimal GET straight to the
 * configured Supabase project's auth health endpoint, bypassing
 * supabase-js entirely, specifically so a network-level failure surfaces
 * its real cause (see describeError's docstring) instead of the generic
 * "fetch failed" supabase.auth.signUp() reports. 5s timeout: this must
 * never hang a serverless invocation waiting on a network that's already
 * failing. Narrowly scoped to this investigation — remove once the real
 * cause (DNS/TLS/egress/etc.) is confirmed and fixed.
 */
async function checkSupabaseHealth(): Promise<void> {
  try {
    const base = getSupabaseUrl().replace(/\/+$/, "");
    const res = await fetch(`${base}/auth/v1/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    console.log("[signUpAction] supabase health check", { ok: res.ok, status: res.status });
  } catch (e) {
    console.error("[signUpAction] supabase health check failed", describeError(e));
  }
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
    await checkSupabaseHealth();

    const supabase = await createSupabaseServerClient();
    console.log("[signUpAction] createSupabaseServerClient() succeeded");

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      // supabase-js's AuthError never carries `.cause` — it's constructed
      // from a plain message string by the time it reaches here (see
      // describeError's docstring) — but read it defensively anyway in
      // case that ever changes, rather than assuming.
      console.error("[signUpAction] supabase.auth.signUp() returned an error", {
        status: error.status,
        code: error.code,
        message: error.message,
        ...describeError(error),
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
