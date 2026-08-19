import "server-only";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * Current authenticated user, or null for an anonymous visitor. Never
 * throws — including when Supabase itself isn't reachable/configured, in
 * which case this degrades to "treat as anonymous" rather than breaking
 * every page that calls it (Phase 7 Section 18: personalization/auth must
 * never be a single point of failure for ordinary browsing).
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    return data.user;
  } catch {
    return null;
  }
}

/**
 * User + their profile row together, for pages that need both (Account,
 * onboarding). Returns null for an anonymous visitor. The profile row is
 * expected to exist (see 0003_taste_profile.sql's signup trigger), but this
 * tolerates it being briefly missing rather than throwing — e.g. a request
 * that lands in the tiny window between auth.users insert and the trigger
 * committing — so a slow profile row never turns into a broken page.
 */
export async function getCurrentUserWithProfile(): Promise<{ user: User; profile: ProfileRow | null } | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
    return { user: data.user, profile };
  } catch {
    return null;
  }
}
