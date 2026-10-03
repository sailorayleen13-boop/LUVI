-- LUVI — Phase 8 fix #7: public storefront reads were silently falling
-- back to mock data.
--
-- Bug report: clicking the public/external-store icon (the pink ↗) in
-- /merchant for a real seller's store ("LUVI Squishies") opened a blank
-- 404, with no error shown anywhere.
--
-- Root cause: supabase/repository.ts — the PUBLIC, read-only storefront
-- layer behind /m/[slug], /mp/[slug], /mp, /stores, /explore, /search,
-- /drops/[slug], and the home page's discovery sections — does plain
-- SELECTs against merchants / merchant_locations / products /
-- product_images / product_interests / product_aesthetics / drops /
-- drop_products under the calling anon/authenticated role's own
-- INVOKER-mode privileges. This is the exact same missing-table-grant
-- class of bug already found and fixed for the OWNER-scoped side of the
-- app in 0007/0008/0009/0010 — just never checked on the PUBLIC read
-- side, because every call site here is wrapped in catalog.ts's
-- withMockFallback(), which silently swallows ANY error (permission
-- denied included) and substitutes the small built-in mock catalog
-- instead. So instead of a visible error, a real seller's store or
-- product simply isn't found among the 5 mock sellers, and the page
-- 404s. This almost certainly means the public storefront has been
-- silently serving mock data instead of real Supabase data wherever this
-- grant was missing — not just for this one button. (catalog.ts's
-- fallback now also logs when this happens, so a future occurrence is
-- visible instead of silent — see that file's companion change.)
--
-- Fix: unlike the owner-scoped WRITE gaps (0007-0010), which correctly
-- needed SECURITY DEFINER RPCs (a blanket INSERT/UPDATE/DELETE grant would
-- itself be a real risk), a plain SELECT grant here carries none of that
-- risk: every one of these tables already has a working, already-tested
-- RLS SELECT policy that correctly decides which ROWS are public
-- (status='active' and moderation_status='approved' and, per 0004, not
-- is_draft) versus owner/admin-only — RLS is already the real gate here,
-- same as it always was. The missing piece was purely the underlying
-- table-level grant Postgres checks before RLS is even evaluated. This
-- migration adds exactly that read grant, and nothing else — no RLS
-- policy anywhere is touched, and no write privilege is granted.
--
-- product_interactions is deliberately NOT included: the public storefront
-- never reads it directly (aggregate reads for trending go through the
-- service-role admin client — see supabase/repository.ts's
-- getRecentInteractions() docstring), and 0002_rls.sql has no SELECT
-- policy at all for anon/authenticated on that table by design.

grant select on
  merchants,
  merchant_locations,
  products,
  product_images,
  product_interests,
  product_aesthetics,
  drops,
  drop_products
to anon, authenticated;

notify pgrst, 'reload schema';
