-- LUVI — Phase 6 Row Level Security.
--
-- Fail-closed by default: RLS is enabled on every table below and NO table
-- gets a blanket "select true" policy. Where no policy is written for an
-- operation (e.g. UPDATE/DELETE on product_interactions), that operation is
-- simply impossible through the anon/authenticated roles — only a
-- service-role key (which bypasses RLS entirely in Supabase) can do it, and
-- that key must never reach the browser (see src/lib/supabase/admin.ts).
--
-- Decision 1: merchant write authority is derived entirely from
-- merchant_members, never from a role column on profiles.

-- ---------------------------------------------------------------------------
-- Helper functions (security definer so policies can consult
-- merchant_members/profiles without recursing back into their own RLS).
-- ---------------------------------------------------------------------------

create or replace function is_merchant_member(
  target_merchant_id uuid,
  allowed_roles merchant_member_role[] default array['owner', 'staff']::merchant_member_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from merchant_members mm
    where mm.merchant_id = target_merchant_id
      and mm.user_id = auth.uid()
      and mm.role = any(allowed_roles)
  );
$$;

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_admin from profiles p where p.id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere.
-- ---------------------------------------------------------------------------

alter table profiles enable row level security;
alter table merchants enable row level security;
alter table merchant_members enable row level security;
alter table merchant_locations enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table drops enable row level security;
alter table drop_products enable row level security;
alter table product_interactions enable row level security;
alter table saved_products enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create policy profiles_select_own_or_admin on profiles
  for select
  using (id = auth.uid() or is_admin());

create policy profiles_insert_self on profiles
  for insert
  to authenticated
  with check (id = auth.uid());

create policy profiles_update_own_or_admin on profiles
  for update
  using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

-- No delete policy: profile rows are cleaned up via the auth.users cascade,
-- never deleted directly through the API.

-- ---------------------------------------------------------------------------
-- merchants
-- ---------------------------------------------------------------------------

create policy merchants_select_public_or_member on merchants
  for select
  using (
    (status = 'active' and moderation_status = 'approved')
    or is_merchant_member(id)
    or is_admin()
  );

-- Any signed-in user may create a store; ownership is established by the
-- merchant_members insert that immediately follows (see that table's
-- policies below) — onboarding UI lands in a later phase, this just makes
-- the flow possible without a future RLS change.
create policy merchants_insert_authenticated on merchants
  for insert
  to authenticated
  with check (true);

create policy merchants_update_owner_or_admin on merchants
  for update
  using (is_merchant_member(id, array['owner']::merchant_member_role[]) or is_admin())
  with check (is_merchant_member(id, array['owner']::merchant_member_role[]) or is_admin());

create policy merchants_delete_owner_or_admin on merchants
  for delete
  using (is_merchant_member(id, array['owner']::merchant_member_role[]) or is_admin());

-- ---------------------------------------------------------------------------
-- merchant_members
-- ---------------------------------------------------------------------------

create policy merchant_members_select_self_or_fellow_member on merchant_members
  for select
  using (user_id = auth.uid() or is_merchant_member(merchant_id) or is_admin());

-- Covers two cases: (a) claiming the first/only ownership slot right after
-- creating a merchant (no members exist yet), (b) an existing owner adding
-- another member. Prevents a stranger from inserting themselves as owner
-- into an already-owned merchant.
create policy merchant_members_insert_first_owner_or_existing_owner on merchant_members
  for insert
  to authenticated
  with check (
    (
      user_id = auth.uid()
      and role = 'owner'
      and not exists (
        select 1 from merchant_members existing
        where existing.merchant_id = merchant_members.merchant_id
      )
    )
    or is_merchant_member(merchant_id, array['owner']::merchant_member_role[])
    or is_admin()
  );

create policy merchant_members_update_owner_or_admin on merchant_members
  for update
  using (is_merchant_member(merchant_id, array['owner']::merchant_member_role[]) or is_admin())
  with check (is_merchant_member(merchant_id, array['owner']::merchant_member_role[]) or is_admin());

create policy merchant_members_delete_owner_admin_or_self on merchant_members
  for delete
  using (
    is_merchant_member(merchant_id, array['owner']::merchant_member_role[])
    or is_admin()
    or user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- merchant_locations
-- ---------------------------------------------------------------------------

create policy merchant_locations_select_public_or_member on merchant_locations
  for select
  using (
    exists (
      select 1 from merchants m
      where m.id = merchant_locations.merchant_id
        and m.status = 'active' and m.moderation_status = 'approved'
    )
    or is_merchant_member(merchant_id)
    or is_admin()
  );

create policy merchant_locations_write_member_or_admin on merchant_locations
  for all
  using (is_merchant_member(merchant_id) or is_admin())
  with check (is_merchant_member(merchant_id) or is_admin());

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------

create policy products_select_public_or_member on products
  for select
  using (
    (status = 'active' and moderation_status = 'approved')
    or is_merchant_member(merchant_id)
    or is_admin()
  );

create policy products_write_member_or_admin on products
  for all
  using (is_merchant_member(merchant_id) or is_admin())
  with check (is_merchant_member(merchant_id) or is_admin());

-- ---------------------------------------------------------------------------
-- product_images
-- ---------------------------------------------------------------------------

create policy product_images_select_public_or_member on product_images
  for select
  using (
    exists (
      select 1 from products p
      where p.id = product_images.product_id
        and p.status = 'active' and p.moderation_status = 'approved'
    )
    or exists (
      select 1 from products p
      where p.id = product_images.product_id and is_merchant_member(p.merchant_id)
    )
    or is_admin()
  );

create policy product_images_write_member_or_admin on product_images
  for all
  using (
    exists (
      select 1 from products p
      where p.id = product_images.product_id and is_merchant_member(p.merchant_id)
    )
    or is_admin()
  )
  with check (
    exists (
      select 1 from products p
      where p.id = product_images.product_id and is_merchant_member(p.merchant_id)
    )
    or is_admin()
  );

-- ---------------------------------------------------------------------------
-- drops / drop_products — LUVI-curated editorial content, admin-only writes.
-- ---------------------------------------------------------------------------

create policy drops_select_published_or_admin on drops
  for select
  using (status = 'published' or is_admin());

create policy drops_write_admin_only on drops
  for all
  using (is_admin())
  with check (is_admin());

create policy drop_products_select_published_or_admin on drop_products
  for select
  using (
    exists (
      select 1 from drops d where d.id = drop_products.drop_id and d.status = 'published'
    )
    or is_admin()
  );

create policy drop_products_write_admin_only on drop_products
  for all
  using (is_admin())
  with check (is_admin());

-- ---------------------------------------------------------------------------
-- product_interactions — write-only from the client. Deliberately NO select
-- policy: raw events are never publicly (or even self-) selectable through
-- anon/authenticated roles in this phase. Aggregate reads (trending,
-- merchant analytics) go through service-role-only server code — see
-- src/lib/supabase/admin.ts — never a client-side select.
-- ---------------------------------------------------------------------------

create policy product_interactions_insert_own_or_anonymous on product_interactions
  for insert
  to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

-- No select/update/delete policy: fails closed for anon and authenticated.

-- ---------------------------------------------------------------------------
-- saved_products — authenticated-only (Decision 2); anonymous saves never
-- reach this table.
-- ---------------------------------------------------------------------------

create policy saved_products_select_own on saved_products
  for select
  to authenticated
  using (user_id = auth.uid());

create policy saved_products_insert_own on saved_products
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy saved_products_delete_own on saved_products
  for delete
  to authenticated
  using (user_id = auth.uid());
