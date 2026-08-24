import "server-only";
import { getProductIdsBySlugs } from "@/lib/marketplace/supabase/repository";

/**
 * Phase 7's catalog cutover moved saved_products/product_interactions back
 * to real Supabase UUID FKs (see 0003_taste_profile.sql's header comment)
 * instead of loosening the schema to accept the mock catalog's ids ("p1",
 * "m1"). That leaves one loose end: a browser that saved products BEFORE
 * this cutover has those mock ids sitting in its localStorage wishlist
 * (src/lib/store/wishlist-context.tsx). This module is the one place that
 * reconciles that: given a batch of local ids, it returns only ids that
 * are safe to use against the real database — resolving a known legacy
 * mock id to its real UUID via the slug it shares with the real seed
 * (seed.sql mirrors mock/products.ts's slugs exactly), and silently
 * dropping anything it can't resolve. Nothing here ever sends a non-UUID
 * string to Supabase.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Mock product id -> slug, for every id in mock/products.ts. Static and
// small enough to inline rather than derive at runtime from the (mock-only)
// products array, since this table's whole purpose is bridging AWAY from
// that array.
const LEGACY_MOCK_PRODUCT_SLUGS: Record<string, string> = {
  p1: "squishy-frappuccino-gigante",
  p2: "squishy-panda-kawaii",
  p3: "squishy-fresa-jumbo",
  p4: "squishy-hamburguesa-mini-pack",
  p5: "squishy-avocado-suave",
  p6: "squishy-luna-estrellas",
  p7: "squishy-boba-tea-xl",
  p8: "set-squishies-sanrio-style",
  p9: "correa-arcoiris-mascota",
  p10: "cama-nube-mascota",
  p11: "lampara-luna-led",
  p12: "organizador-escritorio-kawaii",
  p13: "funda-audifonos-oso",
  p14: "mini-ventilador-portatil-viral",
  p15: "mini-proyector-portatil-viral",
  p16: "blind-box-mystery-figure",
  p17: "lip-tint-glow",
  p18: "bolso-crossbody-mini",
  p19: "set-tarjetas-regalo-cute",
};

/**
 * Splits localIds into real UUIDs (passed through as-is) and legacy mock
 * ids (resolved to their real UUID via a batch slug lookup). Anything that
 * is neither a UUID nor a known legacy mock id is dropped — it can't have
 * come from a real save, so there is nothing safe to do with it except
 * ignore it.
 */
export async function resolveLegacyOrRealProductIds(localIds: string[]): Promise<string[]> {
  if (localIds.length === 0) return [];

  const alreadyUuid = localIds.filter((id) => UUID_RE.test(id));
  const legacyIds = localIds.filter((id) => !UUID_RE.test(id));
  const legacySlugs = legacyIds
    .map((id) => LEGACY_MOCK_PRODUCT_SLUGS[id])
    .filter((slug): slug is string => Boolean(slug));

  if (legacySlugs.length === 0) return alreadyUuid;

  try {
    const idBySlug = await getProductIdsBySlugs(legacySlugs);
    const resolved = legacySlugs
      .map((slug) => idBySlug.get(slug))
      .filter((id): id is string => Boolean(id));
    return [...alreadyUuid, ...resolved];
  } catch {
    // Resolution failed (e.g. Supabase unreachable) — never let a stale
    // legacy id block or crash whatever called this; just drop them.
    return alreadyUuid;
  }
}
