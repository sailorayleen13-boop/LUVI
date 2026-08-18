import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

/**
 * Server-side client for Server Components / Route Handlers / Server
 * Actions — anon key + the request's cookies, so it reads/writes as
 * whichever user the cookies belong to (or anonymous, if none). Still fully
 * subject to RLS, same as the browser client; the only difference is where
 * it runs.
 *
 * Requires a dynamic (non-static-export) request context, so it only works
 * once the app is served from Vercel, not from the GITHUB_PAGES static
 * export — nothing calls this yet, so that's not a build-time conflict.
 *
 * Cookie writes are wrapped in try/catch per the standard @supabase/ssr
 * Next.js pattern: a Server Component can't set cookies (only Server
 * Actions / Route Handlers can) — when that happens middleware-based
 * session refresh is expected to cover it. LUVI has no middleware yet
 * (see next.config.ts's static-export note); that's a Phase 7 addition
 * once GitHub Pages is fully retired, since middleware.ts is incompatible
 * with `output: "export"`.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render — no-op, see doc comment above.
        }
      },
    },
  });
}
