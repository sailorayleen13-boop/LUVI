-- LUVI — Phase 8 fix: atomic store creation.
--
-- Bug report: submitting /sell's store creation form failed on the very
-- first attempt with a generic "No pudimos crear tu tienda" error, and the
-- catch block that produced it swallowed the real Postgres error entirely
-- (no logging), so there was nothing to diagnose from Vercel's logs either.
--
-- Root cause: merchant-repository.ts's createStore() performed THREE
-- separate round-trips — insert merchants, insert merchant_members, insert
-- merchant_locations — each its own independent PostgREST call/transaction.
-- RLS itself was verified correct for every one of these individually (see
-- the Phase 8 completion report's local RLS test matrix, including a
-- customer-creates-their-own-store case that passed), so this is not an
-- RLS bug. But merchant_members.user_id references profiles(id), not
-- auth.users(id) directly — any session whose profiles row is missing for
-- some reason (created through a path that predates 0003's
-- on_auth_user_created trigger, or any other edge case) makes the SECOND
-- insert fail with a foreign-key violation, after the FIRST insert (the
-- merchant row itself) already committed. That leaves an orphaned,
-- unowned merchant row behind and surfaces only as the generic caught
-- error — exactly what was reported.
--
-- Fix: bundle all three inserts into one PL/pgSQL function, so one
-- supabase-js `.rpc()` call is one Postgres transaction — any failure
-- anywhere inside rolls back everything, so there is no more partial/
-- orphaned state to produce a confusing one-off failure. Also inserts the
-- caller's own profiles row first (on conflict do nothing) as a
-- belt-and-suspenders close of the exact gap above, whatever originally
-- caused it.
--
-- Deliberately SECURITY INVOKER (the default — no `security definer`
-- here): every statement below still runs as the calling authenticated
-- user, so profiles_insert_self / merchants_insert_authenticated /
-- merchant_members_insert_first_owner_or_existing_owner /
-- merchant_locations_write_member_or_admin all still apply exactly as
-- before this migration. This function changes NOTHING about who is
-- allowed to do what — it only makes the existing three writes atomic.
-- A user still can only ever end up the OWNER of the merchant THIS call
-- just created (auth.uid() is read server-side inside the function, never
-- taken from an argument), so this cannot be used to attach a user to, or
-- read/write, anyone else's store.

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
