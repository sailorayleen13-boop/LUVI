-- LUVI — Phase 8 fix #2: force PostgREST to see create_merchant_with_owner.
--
-- Store creation is still failing after 0005 was applied, with the exact
-- same generic error, on multiple different inputs — ruling out a
-- data-dependent cause (slug collision, a specific name/value). That
-- pattern — a newly created function that a REST client can't successfully
-- call right after it's created via a migration/SQL editor run — is the
-- signature of PostgREST's schema cache not having picked up the new
-- function yet. Supabase normally auto-reloads on DDL via a built-in event
-- trigger, but this migration ships the standard manual fallback (and
-- redundant safety net) for exactly this situation: `NOTIFY pgrst, 'reload
-- schema'` is Supabase/PostgREST's documented way to force an immediate
-- reload without waiting on anything.
--
-- This migration does NOT change 0005's function body, its security model
-- (still SECURITY INVOKER — RLS is still what's actually enforcing
-- everything), or its signature. It only:
--   1. Re-applies the identical function definition (idempotent
--      `create or replace`) — closes the door on any partial/corrupted
--      apply of 0005 as a second possible cause, and its own DDL is itself
--      a trigger for Supabase's auto-reload.
--   2. Re-asserts the exact same grants 0005 already set, in case that
--      half of 0005 didn't fully take for any reason.
--   3. Explicitly NOTIFYs PostgREST to reload its schema cache right now.
--
-- If store creation still fails after this is applied, the cause is not
-- schema-cache visibility — see this migration's companion code change in
-- merchant-repository.ts, which now logs a specific diagnostic CATEGORY
-- (not just the raw Postgres error) for exactly this reason: to make the
-- next failure identifiable from Vercel's logs without guessing again.

create or replace function public.create_merchant_with_owner(
  p_slug text,
  p_name text,
  p_logo text,
  p_website text,
  p_whatsapp text,
  p_instagram text,
  p_region text,
  p_city text,
  p_address_optional text
)
returns uuid
language plpgsql
as $$
declare
  v_merchant_id uuid;
begin
  insert into public.profiles (id) values (auth.uid())
  on conflict (id) do nothing;

  insert into public.merchants (slug, name, logo, website, whatsapp, instagram, status, moderation_status)
  values (p_slug, p_name, p_logo, p_website, p_whatsapp, p_instagram, 'active', 'approved')
  returning id into v_merchant_id;

  insert into public.merchant_members (merchant_id, user_id, role)
  values (v_merchant_id, auth.uid(), 'owner');

  if p_region is not null or p_city is not null or p_address_optional is not null then
    insert into public.merchant_locations (merchant_id, region, city, address_optional, is_primary)
    values (v_merchant_id, p_region, p_city, p_address_optional, true);
  end if;

  return v_merchant_id;
end;
$$;

revoke all on function public.create_merchant_with_owner(text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.create_merchant_with_owner(text, text, text, text, text, text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
