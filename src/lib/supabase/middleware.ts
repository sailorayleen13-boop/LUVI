import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

/**
 * Session refresh for Next.js middleware — the standard @supabase/ssr
 * pattern: a Supabase client backed by the *request's* cookies (read) and
 * the *response's* cookies (write), so an expiring session gets a fresh
 * access token on every request before any Server Component ever runs.
 * Without this, `createSupabaseServerClient()` (src/lib/supabase/server.ts)
 * can silently see a stale/expired session on a page load, since Server
 * Components themselves cannot write cookies.
 *
 * Mirrors createSupabaseServerClient()'s getAll/setAll shape, just backed
 * by NextRequest/NextResponse instead of next/headers' cookies().
 */
export async function updateSupabaseSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  // Runs on essentially every request (see middleware.ts's matcher) — if
  // Supabase isn't configured yet (env vars unset, e.g. before a Vercel
  // project has them, or in any environment running without them), this
  // must fall through to a normal, unmodified response rather than taking
  // the entire site down. Anonymous browsing must never depend on auth
  // infrastructure being healthy (Phase 7 Sections 2 and 18).
  try {
    const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    });

    // Touching auth.getUser() is what actually triggers the refresh (and
    // the setAll call above) when the current access token is stale — a
    // plain getSession() would just read the existing (possibly expired)
    // cookie.
    await supabase.auth.getUser();
  } catch {
    return NextResponse.next({ request });
  }

  return response;
}
