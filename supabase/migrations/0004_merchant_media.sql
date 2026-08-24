-- LUVI — Phase 8: merchant onboarding & seller experience V1.
--
-- Reviewed 0001_schema.sql / 0002_rls.sql / 0003_taste_profile.sql before
-- writing this — never edits any of them. Two additions:
--   1. products.is_draft — the smallest correct way to represent "a seller
--      is still working on this listing" without touching the existing
--      product_status enum ('active' | 'archived'). A new enum VALUE
--      (e.g. adding 'draft' to product_status) was considered and rejected:
--      Postgres disallows using a freshly-added enum value inside the same
--      transaction that added it, which is exactly the kind of migration
--      hazard this file has no reason to risk when a plain boolean says
--      the same thing more simply. A draft is still status='active' (it's
--      not archived) — is_draft is an orthogonal "not ready yet" flag, not
--      a third lifecycle state layered onto the existing one.
--   2. A public Storage bucket + policies for merchant-uploaded product
--      photos and store logos — the first real Storage surface in this
--      project, so RLS on storage.objects needs writing from scratch here.
--
-- Moderation: this migration does NOT touch merchants.moderation_status or
-- products.moderation_status defaults or policies — both already default to
-- 'pending' at the column level, but every INSERT this phase's Server
-- Actions perform explicitly sets moderation_status = 'approved' at
-- creation time (see src/lib/marketplace/supabase/merchant-repository.ts).
-- That is Phase 8's deliberate V1 moderation stance — auto-publish, no
-- review queue, documented in the completion report — not an oversight;
-- the column is preserved exactly as-is so a future phase can add real
-- moderation by changing what the app writes, without another migration.

-- ---------------------------------------------------------------------------
-- products.is_draft
-- ---------------------------------------------------------------------------

alter table products add column is_draft boolean not null default false;

-- Optional "before" price for a strike-through discount display (Section 5's
-- "optional previous/original price if architecture supports it cleanly") —
-- a single nullable numeric column is exactly that: no enum, no new table,
-- same check-constraint shape as the existing `price` column.
alter table products add column original_price numeric(12, 2) check (original_price is null or original_price >= 0);

create index products_merchant_draft_idx on products (merchant_id, is_draft);

-- Public visibility must exclude drafts; the merchant-member/admin branches
-- are unchanged (a seller can always see their own drafts). Recreated, not
-- altered in place, since Postgres has no ALTER POLICY for the USING clause
-- body — this is standard practice for evolving a policy in a later
-- migration, not a rewrite of 0002_rls.sql itself.
drop policy if exists products_select_public_or_member on products;
create policy products_select_public_or_member on products
  for select
  using (
    (status = 'active' and moderation_status = 'approved' and not is_draft)
    or is_merchant_member(merchant_id)
    or is_admin()
  );

drop policy if exists product_images_select_public_or_member on product_images;
create policy product_images_select_public_or_member on product_images
  for select
  using (
    exists (
      select 1 from products p
      where p.id = product_images.product_id
        and p.status = 'active' and p.moderation_status = 'approved' and not p.is_draft
    )
    or exists (
      select 1 from products p
      where p.id = product_images.product_id and is_merchant_member(p.merchant_id)
    )
    or is_admin()
  );

-- ---------------------------------------------------------------------------
-- Storage — one public bucket for both product photos and store logos,
-- path-scoped rather than split into two buckets, so there's one set of
-- ownership policies to maintain instead of two:
--   {merchant_id}/products/{filename}
--   {merchant_id}/logo/{filename}
-- Public bucket = Supabase serves reads straight off its CDN
-- (/storage/v1/object/public/...) without going through RLS at all, which
-- is correct here (product photos and store logos are meant to be public,
-- same as everything else already public in this schema) — the SELECT
-- policy below only matters for the authenticated management API
-- (listing/signed URLs), not for how a shopper's <img> tag loads a photo.
-- RLS on storage.objects is what actually gates every WRITE regardless of
-- the bucket's public flag, which is the boundary that matters: a merchant
-- can only write under their own {merchant_id}/ prefix.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'merchant-media',
  'merchant-media',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

-- Extracts the leading {merchant_id} path segment and checks membership,
-- never raising on a malformed path (a bad/foreign object name should
-- simply fail the policy, not throw an error out of policy evaluation).
create or replace function public.is_merchant_media_owner(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  merchant_id_text text;
  target_id uuid;
begin
  merchant_id_text := (storage.foldername(object_name))[1];
  if merchant_id_text is null then
    return false;
  end if;
  begin
    target_id := merchant_id_text::uuid;
  exception when invalid_text_representation then
    return false;
  end;
  return is_merchant_member(target_id);
end;
$$;

create policy merchant_media_select_public on storage.objects
  for select
  using (bucket_id = 'merchant-media');

create policy merchant_media_insert_own on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'merchant-media' and is_merchant_media_owner(name));

create policy merchant_media_update_own on storage.objects
  for update
  to authenticated
  using (bucket_id = 'merchant-media' and is_merchant_media_owner(name))
  with check (bucket_id = 'merchant-media' and is_merchant_media_owner(name));

create policy merchant_media_delete_own on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'merchant-media' and is_merchant_media_owner(name));
