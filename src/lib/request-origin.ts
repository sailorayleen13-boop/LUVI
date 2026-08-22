import "server-only";
import { headers } from "next/headers";

/**
 * This deployment's own public origin, derived from the incoming request
 * rather than any hardcoded/configured domain — used to build Supabase
 * Auth's `emailRedirectTo` (see lib/auth/actions.ts's signUpAction) so the
 * email-confirmation link always points back to wherever the visitor
 * actually is: `next dev` locally, a Vercel Preview deployment (whose URL
 * changes on every push — never hardcode one), or the production domain.
 *
 * `x-forwarded-host`/`x-forwarded-proto` are what Vercel's edge network
 * sets on every request to reflect the hostname/protocol the visitor's
 * browser actually used to reach the app; the plain `host` header is the
 * fallback for `next dev` locally, where there's no forwarding proxy in
 * front of it. NEXT_PUBLIC_SITE_URL and VERCEL_URL are last-resort
 * fallbacks for the rare case `headers()` throws (no request context) —
 * NEXT_PUBLIC_SITE_URL is optional and not required for this to work: set
 * it only if you want a fixed canonical origin (e.g. a custom production
 * domain sitting behind something that strips forwarded headers) to
 * override request-derived detection. VERCEL_URL is populated
 * automatically by Vercel on every deployment; no manual setup needed.
 */
export async function getRequestOrigin(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    // headers() throws outside a request context (e.g. no active request) — fall through.
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
