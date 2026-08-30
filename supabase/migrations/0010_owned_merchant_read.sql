-- LUVI — Phase 8 fix #6: move the ENTIRE owner-scoped merchant/product
-- surface behind SECURITY DEFINER RPCs.
--
-- getOwnedMerchant() hits the exact same wall as the PRE_RPC/POST_RPC
-- failures already fixed (0008/0009): a plain `.from("merchants")`/
-- `.from("merchant_locations")` SELECT under the calling `authenticated`
-- role's own INVOKER-mode privileges. Rather than patch this one call site
-- and risk finding the next one "one screen at a time", every owner-scoped
-- merchants/merchant_locations/products/product_images touch in
-- merchant-repository.ts is moved behind a narrowly-scoped RPC here —
-- covering /sell's existing-store precheck, /merchant, /merchant/settings,
-- and the full product create/edit flow.
--
-- Every function below:
--   - is SECURITY DEFINER with `set search_path = public` pinned;
--   - derives the acting user ONLY from auth.uid() — never a client-
--     supplied user_id;
--   - for anything scoped to a specific merchant/product, re-derives that
--     row's owning merchant server-side and checks membership via
--     is_merchant_member() (0002_rls.sql's existing, already-proven
--     SECURITY DEFINER helper — reused, not reimplemented) or is_admin()
--     before touching anything, so a merchant_id/product_id argument can
--     only ever be used to prove "I don't have access to this", never to
--     read or write someone else's data;
--   - is EXECUTE-restricted to `authenticated` only (anonymous cannot call
--     any of these).
-- No RLS policy anywhere is touched or weakened by this migration — the
-- policies from 0002/0004 remain exactly as they are and still govern
-- every one of these tables for any other caller (e.g. an admin tool, or
-- a future direct-table access path). This migration only changes HOW
-- the Phase 8 app itself reaches this data, not what RLS allows.

-- ---------------------------------------------------------------------------
-- Store (merchant) — read/update
-- ---------------------------------------------------------------------------

create or replace function public.get_owned_merchant()
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
declare
  v_merchant_id uuid;
begin
  if auth.uid() is null then
    return;
  end if;

  select mm.merchant_id into v_merchant_id
  from public.merchant_members mm
  where mm.user_id = auth.uid()
  limit 1;

  if v_merchant_id is null then
    return;
  end if;

  return query
  select m.id, m.slug, m.name, m.logo, m.description, m.website, m.whatsapp, m.instagram, m.status, m.created_at,
         l.region, l.city, l.address_optional
  from public.merchants m
  left join public.merchant_locations l on l.merchant_id = m.id and l.is_primary
  where m.id = v_merchant_id;
end;
$$;

create or replace function public.update_owned_merchant(
  p_name text,
  p_logo text,
  p_website text,
  p_whatsapp text,
  p_instagram text,
  p_region text,
  p_city text,
  p_address_optional text
)
returns void
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

  select mm.merchant_id into v_merchant_id
  from public.merchant_members mm
  where mm.user_id = auth.uid() and mm.role = 'owner'
  limit 1;

  if v_merchant_id is null then
    raise exception 'no owned merchant found';
  end if;

  update public.merchants set
    name = coalesce(p_name, name),
    logo = p_logo,
    website = p_website,
    whatsapp = p_whatsapp,
    instagram = p_instagram
  where id = v_merchant_id;

  if p_region is not null or p_city is not null or p_address_optional is not null then
    insert into public.merchant_locations (merchant_id, region, city, address_optional, is_primary)
    values (v_merchant_id, p_region, p_city, p_address_optional, true)
    on conflict (merchant_id) where is_primary
    do update set region = excluded.region, city = excluded.city, address_optional = excluded.address_optional;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Products (owner-scoped — includes drafts/archived, image/interest/
-- aesthetic arrays aggregated inline so the app never needs a follow-up
-- read against product_images/product_interests/product_aesthetics either)
-- ---------------------------------------------------------------------------

create or replace function public.get_merchant_products(p_merchant_id uuid)
returns table (
  id uuid, merchant_id uuid, slug text, name text, description text, short_description text,
  category text, price numeric, original_price numeric, currency text,
  availability text, is_draft boolean, status text,
  delivery_estimate text, external_purchase_url text, whatsapp_url text, instagram_url text,
  created_at timestamptz, updated_at timestamptz,
  images text[], interests text[], aesthetics text[]
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  if not (public.is_merchant_member(p_merchant_id) or public.is_admin()) then
    raise exception 'not a member of this merchant';
  end if;

  return query
  select
    p.id, p.merchant_id, p.slug, p.name, p.description, p.short_description,
    p.category::text, p.price, p.original_price, p.currency::text,
    p.availability::text, p.is_draft, p.status::text,
    p.delivery_estimate, p.external_purchase_url, p.whatsapp_url, p.instagram_url,
    p.created_at, p.updated_at,
    coalesce((select array_agg(pi.url order by pi.position) from public.product_images pi where pi.product_id = p.id), array[]::text[]),
    coalesce((select array_agg(pint.interest) from public.product_interests pint where pint.product_id = p.id), array[]::text[]),
    coalesce((select array_agg(pa.aesthetic) from public.product_aesthetics pa where pa.product_id = p.id), array[]::text[])
  from public.products p
  where p.merchant_id = p_merchant_id
  order by p.created_at desc;
end;
$$;

create or replace function public.get_owned_product(p_product_id uuid)
returns table (
  id uuid, merchant_id uuid, slug text, name text, description text, short_description text,
  category text, price numeric, original_price numeric, currency text,
  availability text, is_draft boolean, status text,
  delivery_estimate text, external_purchase_url text, whatsapp_url text, instagram_url text,
  created_at timestamptz, updated_at timestamptz,
  images text[], interests text[], aesthetics text[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_merchant_id uuid;
begin
  if auth.uid() is null then
    return;
  end if;

  select p.merchant_id into v_merchant_id from public.products p where p.id = p_product_id;
  if v_merchant_id is null then
    return;
  end if;
  if not (public.is_merchant_member(v_merchant_id) or public.is_admin()) then
    raise exception 'not a member of this merchant';
  end if;

  return query
  select
    p.id, p.merchant_id, p.slug, p.name, p.description, p.short_description,
    p.category::text, p.price, p.original_price, p.currency::text,
    p.availability::text, p.is_draft, p.status::text,
    p.delivery_estimate, p.external_purchase_url, p.whatsapp_url, p.instagram_url,
    p.created_at, p.updated_at,
    coalesce((select array_agg(pi.url order by pi.position) from public.product_images pi where pi.product_id = p.id), array[]::text[]),
    coalesce((select array_agg(pint.interest) from public.product_interests pint where pint.product_id = p.id), array[]::text[]),
    coalesce((select array_agg(pa.aesthetic) from public.product_aesthetics pa where pa.product_id = p.id), array[]::text[])
  from public.products p
  where p.id = p_product_id;
end;
$$;

create or replace function public.create_merchant_product(
  p_merchant_id uuid,
  p_name text,
  p_description text,
  p_category text,
  p_price numeric,
  p_original_price numeric,
  p_availability text,
  p_delivery_estimate text,
  p_external_purchase_url text,
  p_whatsapp_url text,
  p_instagram_url text,
  p_is_draft boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_root_slug text;
  v_candidate text;
  v_suffix int := 1;
  v_product_id uuid;
begin
  if not (public.is_merchant_member(p_merchant_id) or public.is_admin()) then
    raise exception 'not a member of this merchant';
  end if;

  v_root_slug := trim(both '-' from regexp_replace(lower(unaccent(p_name)), '[^a-z0-9]+', '-', 'g'));
  if v_root_slug is null or v_root_slug = '' then
    v_root_slug := 'producto-' || substr(md5(random()::text || clock_timestamp()::text), 1, 6);
  end if;
  v_candidate := v_root_slug;

  loop
    begin
      insert into public.products (
        merchant_id, slug, name, description, short_description, category, price, original_price,
        currency, availability, delivery_estimate, external_purchase_url, whatsapp_url, instagram_url,
        moderation_status, status, is_draft
      ) values (
        p_merchant_id, v_candidate, p_name, coalesce(p_description, ''), left(coalesce(p_description, ''), 160),
        p_category::product_category, p_price, p_original_price, 'CRC', p_availability::product_availability,
        p_delivery_estimate, p_external_purchase_url, p_whatsapp_url, p_instagram_url,
        'approved', 'active', p_is_draft
      )
      returning id into v_product_id;
      exit;
    exception when unique_violation then
      v_suffix := v_suffix + 1;
      if v_suffix > 50 then
        v_candidate := v_root_slug || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8);
        insert into public.products (
          merchant_id, slug, name, description, short_description, category, price, original_price,
          currency, availability, delivery_estimate, external_purchase_url, whatsapp_url, instagram_url,
          moderation_status, status, is_draft
        ) values (
          p_merchant_id, v_candidate, p_name, coalesce(p_description, ''), left(coalesce(p_description, ''), 160),
          p_category::product_category, p_price, p_original_price, 'CRC', p_availability::product_availability,
          p_delivery_estimate, p_external_purchase_url, p_whatsapp_url, p_instagram_url,
          'approved', 'active', p_is_draft
        )
        returning id into v_product_id;
        exit;
      end if;
      v_candidate := v_root_slug || '-' || v_suffix::text;
    end;
  end loop;

  return v_product_id;
end;
$$;

create or replace function public.update_merchant_product(
  p_product_id uuid,
  p_name text,
  p_description text,
  p_category text,
  p_price numeric,
  p_original_price numeric,
  p_availability text,
  p_delivery_estimate text,
  p_external_purchase_url text,
  p_whatsapp_url text,
  p_instagram_url text,
  p_is_draft boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_merchant_id uuid;
begin
  select p.merchant_id into v_merchant_id from public.products p where p.id = p_product_id;
  if v_merchant_id is null then
    raise exception 'product not found';
  end if;
  if not (public.is_merchant_member(v_merchant_id) or public.is_admin()) then
    raise exception 'not a member of this merchant';
  end if;

  update public.products set
    name = coalesce(p_name, name),
    description = coalesce(p_description, description),
    short_description = case when p_description is not null then left(p_description, 160) else short_description end,
    category = coalesce(p_category::product_category, category),
    price = coalesce(p_price, price),
    original_price = p_original_price,
    availability = coalesce(p_availability::product_availability, availability),
    delivery_estimate = p_delivery_estimate,
    external_purchase_url = p_external_purchase_url,
    whatsapp_url = p_whatsapp_url,
    instagram_url = p_instagram_url,
    is_draft = coalesce(p_is_draft, is_draft)
  where id = p_product_id;
end;
$$;

create or replace function public.set_product_availability(p_product_id uuid, p_availability text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_merchant_id uuid;
begin
  select p.merchant_id into v_merchant_id from public.products p where p.id = p_product_id;
  if v_merchant_id is null then
    raise exception 'product not found';
  end if;
  if not (public.is_merchant_member(v_merchant_id) or public.is_admin()) then
    raise exception 'not a member of this merchant';
  end if;

  update public.products set availability = p_availability::product_availability where id = p_product_id;
end;
$$;

create or replace function public.archive_merchant_product(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_merchant_id uuid;
begin
  select p.merchant_id into v_merchant_id from public.products p where p.id = p_product_id;
  if v_merchant_id is null then
    raise exception 'product not found';
  end if;
  if not (public.is_merchant_member(v_merchant_id) or public.is_admin()) then
    raise exception 'not a member of this merchant';
  end if;

  update public.products set status = 'archived' where id = p_product_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Product images
-- ---------------------------------------------------------------------------

create or replace function public.add_merchant_product_image(p_product_id uuid, p_url text, p_position int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_merchant_id uuid;
begin
  select p.merchant_id into v_merchant_id from public.products p where p.id = p_product_id;
  if v_merchant_id is null then
    raise exception 'product not found';
  end if;
  if not (public.is_merchant_member(v_merchant_id) or public.is_admin()) then
    raise exception 'not a member of this merchant';
  end if;

  insert into public.product_images (product_id, url, position) values (p_product_id, p_url, p_position);
end;
$$;

create or replace function public.delete_merchant_product_image(p_image_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_merchant_id uuid;
begin
  select p.merchant_id into v_merchant_id
  from public.product_images pi
  join public.products p on p.id = pi.product_id
  where pi.id = p_image_id;
  if v_merchant_id is null then
    raise exception 'image not found';
  end if;
  if not (public.is_merchant_member(v_merchant_id) or public.is_admin()) then
    raise exception 'not a member of this merchant';
  end if;

  delete from public.product_images where id = p_image_id;
end;
$$;

create or replace function public.get_merchant_product_images(p_product_id uuid)
returns table (id uuid, url text, "position" int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_merchant_id uuid;
begin
  select p.merchant_id into v_merchant_id from public.products p where p.id = p_product_id;
  if v_merchant_id is null then
    return;
  end if;
  if not (public.is_merchant_member(v_merchant_id) or public.is_admin()) then
    raise exception 'not a member of this merchant';
  end if;

  return query
  select pi.id, pi.url, pi.position from public.product_images pi
  where pi.product_id = p_product_id
  order by pi.position asc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants — EXECUTE to `authenticated` only, matching every other bootstrap
-- RPC in this migration series (0005/0007/0008/0009).
-- ---------------------------------------------------------------------------

revoke all on function public.get_owned_merchant() from public;
grant execute on function public.get_owned_merchant() to authenticated;

revoke all on function public.update_owned_merchant(text, text, text, text, text, text, text, text) from public;
grant execute on function public.update_owned_merchant(text, text, text, text, text, text, text, text) to authenticated;

revoke all on function public.get_merchant_products(uuid) from public;
grant execute on function public.get_merchant_products(uuid) to authenticated;

revoke all on function public.get_owned_product(uuid) from public;
grant execute on function public.get_owned_product(uuid) to authenticated;

revoke all on function public.create_merchant_product(uuid, text, text, text, numeric, numeric, text, text, text, text, text, boolean) from public;
grant execute on function public.create_merchant_product(uuid, text, text, text, numeric, numeric, text, text, text, text, text, boolean) to authenticated;

revoke all on function public.update_merchant_product(uuid, text, text, text, numeric, numeric, text, text, text, text, text, boolean) from public;
grant execute on function public.update_merchant_product(uuid, text, text, text, numeric, numeric, text, text, text, text, text, boolean) to authenticated;

revoke all on function public.set_product_availability(uuid, text) from public;
grant execute on function public.set_product_availability(uuid, text) to authenticated;

revoke all on function public.archive_merchant_product(uuid) from public;
grant execute on function public.archive_merchant_product(uuid) to authenticated;

revoke all on function public.add_merchant_product_image(uuid, text, int) from public;
grant execute on function public.add_merchant_product_image(uuid, text, int) to authenticated;

revoke all on function public.delete_merchant_product_image(uuid) from public;
grant execute on function public.delete_merchant_product_image(uuid) to authenticated;

revoke all on function public.get_merchant_product_images(uuid) from public;
grant execute on function public.get_merchant_product_images(uuid) to authenticated;

notify pgrst, 'reload schema';
