"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

/**
 * Browser-side client — anon key only, safe to ship to the client bundle.
 * Every read it performs is subject to RLS (see supabase/migrations/0002_rls.sql):
 * it can never see more than an anonymous or signed-in visitor should.
 *
 * Not imported by any page yet (Phase 6 is infrastructure only) — this is
 * what a future client component reaches for instead of hand-rolling its
 * own createClient() call with the anon key.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey());
}
