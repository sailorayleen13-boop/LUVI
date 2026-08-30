-- LUVI — Phase 8 fix #3: the actual permission root cause.
--
-- Production returned a categorized PERMISSION_DENIED for
-- create_merchant_with_owner() — not an RLS policy rejecting a row (that
-- surfaces as "new row violates row-level security policy", a different
-- category this codebase already distinguishes), but a Postgres GRANT-level
-- rejection, which is checked BEFORE row security is ever evaluated.
--
-- Root cause: 0005/0006 made create_merchant_with_owner() SECURITY INVOKER
-- on purpose, reasoning that RLS alone should be sufficient since the
-- policies governing merchants/merchant_members/merchant_locations/profiles
-- were already verified correct. That reasoning missed a second, separate
-- gate: an INVOKER function's statements run with the CALLING role's own
-- table-level privileges, and RLS policies only narrow which ROWS a role
-- can touch — they do not grant the underlying INSERT privilege on the
-- TABLE itself. Every other privileged write path already in this codebase
-- (is_merchant_member, is_admin, handle_new_user, is_merchant_media_owner —
-- see 0002_rls.sql / 0003_taste_profile.sql / 0004_merchant_media.sql) is
-- SECURITY DEFINER for exactly this reason; create_merchant_with_owner was
-- the one exception, and that exception is what broke.
--
-- Fix: make it SECURITY DEFINER, matching the established pattern. This
-- makes its statements run as the function's owner (who has full table
-- privileges and bypasses RLS), closing the GRANT gap. The function's own
-- logic remains the entire safety boundary while it runs, exactly like
-- every other SECURITY DEFINER function here:
--   - Ownership is derived ONLY from auth.uid(), read server-side inside
--     the function — never from a parameter, so nothing the caller sends
--     can attach them to a store as anyone but themselves.
--   - The function only ever INSERTs a merchant it just created in the
--     same call, then makes auth.uid() its owner — there is no code path
--     that reads or writes an EXISTING merchant, so it cannot be used to
--     join, alter, or inspect anyone else's store.
--   - `set search_path = public` is pinned explicitly (the standard
--     SECURITY DEFINER hardening against search_path hijacking — every
--     other SECURITY DEFINER function in this codebase already does this;
--     0005/0006 also schema-qualified every statement inside the body as a
--     second, redundant layer against exactly that class of attack).
--   - EXECUTE stays revoked from PUBLIC and granted only to `authenticated`
--     — anonymous still cannot call this at all, independent of anything
--     RLS would otherwise decide.
--   - Every OTHER write in this app (editing an existing store, publishing
--     a product, changing availability, archiving, uploading media, etc.)
--     is untouched by this migration and remains fully RLS-enforced under
--     the normal INVOKER path — this migration only changes the one
--     bootstrap operation that has to run before any membership exists.

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
security definer
set search_path = public
as $$
declare
  v_merchant_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

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
