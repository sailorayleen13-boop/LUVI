-- LUVI — Phase 8 fix #5: return the created merchant from the bootstrap RPC.
--
-- Production diagnostic: PERMISSION_MERCHANTS_INSERT · POST_RPC. Stage
-- POST_RPC only fires in code that runs AFTER create_merchant_with_owner()
-- already returned successfully — meaning every occurrence of this error
-- is proof the merchant + owner membership (and location, if provided)
-- were already committed atomically inside the RPC. The failure is
-- entirely in what createStore() does NEXT: a follow-up
-- `.from("merchants").select("*").eq("id", merchantId).single()`, run
-- under the calling `authenticated` role's own INVOKER-mode privileges —
-- the exact same class of gap 0007/0008 already closed for the RPC's own
-- writes and the PRE_RPC slug lookup, hit a third time on a read the app
-- layer never needed to make in the first place.
--
-- Fix: create_merchant_with_owner() now RETURNS the fields the app
-- actually needs (id, slug, name, logo, description, website, whatsapp,
-- instagram, status, created_at, region, city, address_optional) directly
-- from the same call, captured via `returning ... into` on the insert
-- itself and the location fields threaded straight from the function's
-- own inputs (no DB round-trip needed for those — they're exactly what
-- was just inserted). createStore() uses this returned row directly and
-- performs NO follow-up SELECT against merchants or merchant_locations at
-- all, closing this class of gap for good rather than patching around it
-- a third time.
--
-- This is a NEW return type — `create or replace function` cannot change
-- a function's return type, so the old `returns uuid` version from 0008
-- is DROPped and re-created. The parameter list (8 params, no p_slug) is
-- unchanged from 0008.
--
-- Everything about the function's security posture is unchanged: still
-- SECURITY DEFINER with `set search_path = public` pinned, still derives
-- ownership ONLY from auth.uid() (never a parameter), still atomic (one
-- call, one transaction), still EXECUTE-restricted to `authenticated`
-- only, still the same concurrency-safe insert-and-retry slug loop from
-- 0008. No RLS policy anywhere is touched or weakened by this migration —
-- the fix is "stop needing a second protected read", not "make the read
-- work".

drop function if exists public.create_merchant_with_owner(text, text, text, text, text, text, text, text);

create or replace function public.create_merchant_with_owner(
  p_name text,
  p_logo text,
  p_website text,
  p_whatsapp text,
  p_instagram text,
  p_region text,
  p_city text,
  p_address_optional text
)
returns table (
  id uuid,
  slug text,
  name text,
  logo text,
  description text,
  website text,
  whatsapp text,
  instagram text,
  status merchant_status,
  created_at timestamptz,
  region text,
  city text,
  address_optional text
)
language plpgsql
security definer
set search_path = public
as $$
-- The `returns table(...)` columns above (id, slug, name, region, ...)
-- are ALSO usable as bare PL/pgSQL variables anywhere in this body,
-- purely because they're declared as OUT parameters — merely existing in
-- scope is enough to collide with any embedded SQL that references a
-- same-named TABLE column unqualified, even if this body never otherwise
-- reads or writes that OUT parameter by name. `on conflict (id)` below is
-- exactly that: Postgres can't tell whether `id` means the OUT parameter
-- or profiles.id (ON CONFLICT's target list has no table-qualified form
-- to disambiguate with). This pragma makes such ambiguous references
-- resolve to the table column — the only place that applies here — while
-- every other reference either already uses v_-prefixed locals below or
-- is already table-qualified in its own RETURNING clause.
#variable_conflict use_column
declare
  v_root_slug text;
  v_candidate text;
  v_suffix int := 1;
  v_id uuid;
  v_slug text;
  v_name text;
  v_logo text;
  v_description text;
  v_website text;
  v_whatsapp text;
  v_instagram text;
  v_status merchant_status;
  v_created_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  insert into public.profiles (id) values (auth.uid())
  on conflict (id) do nothing;

  v_root_slug := trim(both '-' from regexp_replace(lower(unaccent(p_name)), '[^a-z0-9]+', '-', 'g'));
  if v_root_slug is null or v_root_slug = '' then
    v_root_slug := 'tienda-' || substr(md5(random()::text || clock_timestamp()::text), 1, 6);
  end if;

  v_candidate := v_root_slug;

  loop
    begin
      insert into public.merchants (slug, name, logo, website, whatsapp, instagram, status, moderation_status)
      values (v_candidate, p_name, p_logo, p_website, p_whatsapp, p_instagram, 'active', 'approved')
      returning
        merchants.id, merchants.slug, merchants.name, merchants.logo, merchants.description,
        merchants.website, merchants.whatsapp, merchants.instagram, merchants.status, merchants.created_at
      into v_id, v_slug, v_name, v_logo, v_description, v_website, v_whatsapp, v_instagram, v_status, v_created_at;
      exit;
    exception when unique_violation then
      v_suffix := v_suffix + 1;
      if v_suffix > 50 then
        -- Astronomically unlikely — 50 sequential collisions — but never
        -- loop forever; fall back to a random suffix and stop retrying.
        v_candidate := v_root_slug || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8);
        insert into public.merchants (slug, name, logo, website, whatsapp, instagram, status, moderation_status)
        values (v_candidate, p_name, p_logo, p_website, p_whatsapp, p_instagram, 'active', 'approved')
        returning
          merchants.id, merchants.slug, merchants.name, merchants.logo, merchants.description,
          merchants.website, merchants.whatsapp, merchants.instagram, merchants.status, merchants.created_at
        into v_id, v_slug, v_name, v_logo, v_description, v_website, v_whatsapp, v_instagram, v_status, v_created_at;
        exit;
      end if;
      v_candidate := v_root_slug || '-' || v_suffix::text;
    end;
  end loop;

  insert into public.merchant_members (merchant_id, user_id, role)
  values (v_id, auth.uid(), 'owner');

  if p_region is not null or p_city is not null or p_address_optional is not null then
    insert into public.merchant_locations (merchant_id, region, city, address_optional, is_primary)
    values (v_id, p_region, p_city, p_address_optional, true);
  end if;

  id := v_id;
  slug := v_slug;
  name := v_name;
  logo := v_logo;
  description := v_description;
  website := v_website;
  whatsapp := v_whatsapp;
  instagram := v_instagram;
  status := v_status;
  created_at := v_created_at;
  region := p_region;
  city := p_city;
  address_optional := p_address_optional;
  return next;
end;
$$;

revoke all on function public.create_merchant_with_owner(text, text, text, text, text, text, text, text) from public;
grant execute on function public.create_merchant_with_owner(text, text, text, text, text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
