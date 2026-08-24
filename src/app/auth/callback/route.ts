import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Supabase Auth callback — the missing piece behind "confirmation link
 * redirects to localhost": signUpAction now sets `emailRedirectTo` to
 * `${current origin}/auth/callback?next=/onboarding`, and this route is
 * what actually exchanges the link's one-time credential for a real
 * session (cookies), then sends the browser on to `next`. Never linked
 * from anywhere in the app's own UI — only ever reached from the email.
 *
 * Handles two link shapes, since which one Supabase sends depends on the
 * project's Auth Flow Type / email template configuration:
 *  - `?code=...` — the PKCE flow @supabase/ssr defaults to. This is what a
 *    project's default confirmation template produces when Auth Flow Type
 *    is set to PKCE: Supabase's own /auth/v1/verify endpoint validates the
 *    signup token first, then redirects here with a fresh `code`.
 *  - `?token_hash=...&type=...` — the older/alternate template shape,
 *    verified directly via verifyOtp() instead of a code exchange.
 * Confirming and failing to detect either simply bounces to /account
 * (renders the ordinary anonymous sign-in/sign-up panel — never a raw
 * error page) rather than guessing.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/onboarding";

  try {
    const supabase = await createSupabaseServerClient();

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        type: type as "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email",
        token_hash: tokenHash,
      });
      if (error) throw error;
    } else {
      throw new Error("auth callback missing both code and token_hash/type");
    }
  } catch (e) {
    console.error("[auth/callback] confirmation failed", {
      name: e instanceof Error ? e.name : typeof e,
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.redirect(`${origin}/account`);
  }

  return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/onboarding"}`);
}
