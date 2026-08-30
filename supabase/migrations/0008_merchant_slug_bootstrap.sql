-- LUVI — Phase 8 fix #4: move slug generation into the atomic bootstrap RPC.
--
-- Production diagnostic: PERMISSION_MERCHANTS_INSERT · PRE_RPC — traced to
-- merchant-repository.ts's generateUniqueMerchantSlug(), which ran BEFORE
-- create_merchant_with_owner() as a plain SELECT against `merchants`
-- (`.from("merchants").select("id").eq("slug", candidate).maybeSingle()`)
-- to find a free slug. That query runs under the calling `authenticated`
-- role's own INVOKER-mode privileges — the exact same class of gap 0007
-- already fixed for the RPC's own INSERTs, just hit one step earlier, on a
-- SELECT, before the SECURITY DEFINER function is ever called.
--
-- Fix: the application layer no longer touches `merchants` before the
-- bootstrap call at all. create_merchant_with_owner() now derives the slug
-- from p_name itself and finds a free one with a concurrency-safe
-- insert-and-retry loop, entirely inside the same SECURITY DEFINER,
-- single-transaction call that already creates the merchant/membership/
-- location — so every merchants-table touch in the bootstrap path now runs
-- as the function's owner, not the caller.
--
-- Concurrency safety: rather than SELECT-to-check-then-INSERT (a
-- check-then-act race — two concurrent callers could both see a slug as
-- free and both try to claim it), each candidate is INSERTed directly and
-- a caught `unique_violation` moves to the next candidate. The UNIQUE
-- constraint on merchants.slug is the actual arbiter, atomically, so this
-- is correct under concurrent calls: "Mi Tienda" x2 concurrently reliably
-- yields mi-tienda and mi-tienda-2 (or the reverse), never a collision and
-- never a lost store. PL/pgSQL's exception block is an implicit
-- SAVEPOINT/ROLLBACK TO SAVEPOINT, so a failed attempt cleanly undoes only
-- that one insert, not the whole call.
--
-- This is a NEW function signature (p_slug removed) — create_merchant_with_owner
-- is DROPped and re-created rather than `create or replace`d, since
-- `create or replace` cannot change a function's parameter list. The old
-- 9-parameter overload from 0005/0006/0007 no longer exists after this.
--
-- Everything else about the function is unchanged from 0007: still
-- SECURITY DEFINER with `set search_path = public` pinned, still derives
-- ownership ONLY from auth.uid() (never a parameter — nothing here lets a
-- caller become owner of anyone else's store, or of an existing store at
-- all), still atomic (one call, one transaction, no partial/orphaned rows
-- possible), still EXECUTE-restricted to `authenticated` only.

create extension if not exists "unaccent";

drop function if exists public.create_merchant_with_owner(text, text, text, text, text, text, text, text, text);

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
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_merchant_id uuid;
  v_root_slug text;
  v_candidate text;
  v_suffix int := 1;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  insert into public.profiles (id) values (auth.uid())
  on conflict (id) do nothing;

  -- Same normalization as src/lib/marketplace/slug.ts's slugify(): lowercase,
  -- strip accents, collapse anything non [a-z0-9] into a single hyphen, trim
  -- leading/trailing hyphens, fall back to a random id if nothing usable is
  -- left (e.g. a name that's entirely emoji).
  v_root_slug := trim(both '-' from regexp_replace(lower(unaccent(p_name)), '[^a-z0-9]+', '-', 'g'));
  if v_root_slug is null or v_root_slug = '' then
    v_root_slug := 'tienda-' || substr(md5(random()::text || clock_timestamp()::text), 1, 6);
  end if;

  v_candidate := v_root_slug;

  loop
    begin
      insert into public.merchants (slug, name, logo, website, whatsapp, instagram, status, moderation_status)
      values (v_candidate, p_name, p_logo, p_website, p_whatsapp, p_instagram, 'active', 'approved')
      returning id into v_merchant_id;
      exit;
    exception when unique_violation then
      v_suffix := v_suffix + 1;
      if v_suffix > 50 then
        -- Astronomically unlikely — 50 sequential collisions — but never
        -- loop forever; fall back to a random suffix and stop retrying.
        v_candidate := v_root_slug || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8);
        insert into public.merchants (slug, name, logo, website, whatsapp, instagram, status, moderation_status)
        values (v_candidate, p_name, p_logo, p_website, p_whatsapp, p_instagram, 'active', 'approved')
        returning id into v_merchant_id;
        exit;
      end if;
      v_candidate := v_root_slug || '-' || v_suffix::text;
    end;
  end loop;

  insert into public.merchant_members (merchant_id, user_id, role)
  values (v_merchant_id, auth.uid(), 'owner');

  if p_region is not null or p_city is not null or p_address_optional is not null then
    insert into public.merchant_locations (merchant_id, region, city, address_optional, is_primary)
    values (v_merchant_id, p_region, p_city, p_address_optional, true);
  end if;

  return v_merchant_id;
end;
$$;

revoke all on function public.create_merchant_with_owner(text, text, text, text, text, text, text, text) from public;
grant execute on function public.create_merchant_with_owner(text, text, text, text, text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
