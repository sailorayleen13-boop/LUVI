import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/supabase/env";

/**
 * Privileged client — service-role key, bypasses RLS entirely (see
 * supabase/migrations/0002_rls.sql's "service_role bypasses RLS" note).
 * `import "server-only"` makes any accidental import from a Client
 * Component a BUILD error, not just a bad practice: this file, and the
 * service-role key it reads, must never reach the browser bundle.
 *
 * Reserved for genuinely server-only, cross-tenant operations that RLS
 * can't express as a normal user action — moderation approvals, aggregate
 * analytics reads over product_interactions (see Phase 5 Section 6: raw
 * interaction rows are never publicly selectable), admin tooling. Ordinary
 * reads/writes on behalf of a signed-in user should go through
 * createSupabaseServerClient()/createSupabaseBrowserClient() instead, so
 * RLS stays the actual enforcement point, not "app code remembered to
 * check."
 *
 * Not called from anywhere yet — Phase 6 is infrastructure only, no
 * moderation/admin UI exists.
 */
export function createSupabaseAdminClient() {
  return createClient<Database>(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
