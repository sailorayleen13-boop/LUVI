/**
 * Fail-fast env var reads shared by the browser/server/admin clients, so a
 * missing var surfaces immediately at the call site instead of as a vague
 * "fetch failed" once a Supabase call is attempted.
 */

export function getSupabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  const trimmed = raw.trim();
  // A copy-pasted env var value can carry a leading/trailing space or a
  // stray newline that's invisible in the Vercel dashboard but breaks URL
  // parsing/DNS lookup — trim defensively and warn (never logs the value
  // itself, only whether trimming changed anything and by how many
  // characters) so a future misconfiguration like this is obvious in logs
  // instead of surfacing as an opaque "fetch failed".
  if (trimmed !== raw) {
    console.warn("[getSupabaseUrl] NEXT_PUBLIC_SUPABASE_URL had leading/trailing whitespace", {
      rawLength: raw.length,
      trimmedLength: trimmed.length,
    });
  }
  return trimmed;
}

export function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return key;
}

export function getSupabaseServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  return key;
}
