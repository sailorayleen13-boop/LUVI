/**
 * Deterministic feed-freshness architecture for Home. The goal (per the
 * discovery UX pass) is a feed that doesn't look byte-identical every time
 * someone opens LUVI, WITHOUT touching anything that's actually ranked —
 * "Para vos" (affinity/trending-scored), Trending, Most LUVI'd, and New
 * Arrivals all keep their exact existing order, because that order IS the
 * signal (Recommendation Engine V1 stays untouched and fully deterministic
 * given its inputs).
 *
 * What this module rotates instead is presentation of UNRANKED collections
 * — a category listing, a merchant directory — where there was never a
 * "correct" order to begin with. The rotation is a pure function of
 * (scope, calendar day), not Math.random(): the same visitor sees a stable
 * arrangement all day, and it's exactly reproducible for testing, but it
 * changes day to day instead of being permanently fixed. No client-only
 * state, no hydration mismatch risk — this can run on the server during
 * the initial render.
 */

/** FNV-1a — small, fast, and stable across JS runtimes; not cryptographic, doesn't need to be. */
function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * A deterministic seed for `scope`, stable for the whole UTC calendar day
 * and different from every other scope's seed. Pass a fixed `date` in
 * tests for a reproducible value.
 */
export function dailyRotationSeed(scope: string, date: Date = new Date()): number {
  const dayKey = date.toISOString().slice(0, 10); // YYYY-MM-DD, UTC
  return hashString(`${scope}:${dayKey}`);
}

/**
 * Cyclic-shifts `items` by an offset derived from `seed` — same relative
 * order, different starting point. Deliberately NOT a shuffle: a shuffle
 * would scramble whatever partial ordering the caller's data already has
 * (e.g. a category listing is usually still createdAt-ordered upstream);
 * a rotation just changes where the "window" starts, which is enough to
 * make a short unranked list feel less static without discarding that
 * order. A no-op on 0/1-item lists.
 */
export function rotateByDailySeed<T>(items: readonly T[], seed: number): T[] {
  if (items.length <= 1) return [...items];
  const offset = seed % items.length;
  if (offset === 0) return [...items];
  return [...items.slice(offset), ...items.slice(0, offset)];
}
