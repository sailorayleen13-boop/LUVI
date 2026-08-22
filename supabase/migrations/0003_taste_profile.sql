-- LUVI — Phase 7: auth, profiles, and Taste Profile V1.
--
-- Reviewed 0001_schema.sql / 0002_rls.sql before writing this — the
-- existing profiles/saved_products/product_interactions tables remain the
-- canonical shape, UUID foreign keys included. This migration only adds
-- what's genuinely new; it never edits 0001/0002 themselves, and does NOT
-- touch saved_products.product_id or product_interactions.{product_id,
-- merchant_id} — those stay `uuid references products(id)` / `references
-- merchants(id)` exactly as 0001 defined them. An earlier draft of this
-- migration weakened those to text to accommodate the mock catalog's
-- non-UUID ids ("p1", "m1"); that direction was rejected on review — the
-- schema is long-lived and the mock catalog is not, so Phase 7 instead
-- cuts the storefront over to the real seeded Supabase catalog (see
-- src/lib/marketplace/supabase/repository.ts and the completion report's
-- "Catalog cutover" section) rather than loosening referential integrity.

-- ---------------------------------------------------------------------------
-- Auto-create a profile row on signup. This is the standard, recommended
-- Supabase pattern (a trigger on auth.users, not client-side "insert after
-- signup" code) specifically because it can't be skipped by an interrupted
-- client flow, a network error after signup, or a user who never loads the
-- app again after confirming their email.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- profiles: two new nullable columns, kept SEPARATE on purpose.
-- taste_onboarding_completed_at is set only when a user actually submits
-- interest/aesthetic picks; taste_onboarding_skipped_at is set only when
-- they skip instead. Neither column triggers a repeat redirect into
-- onboarding today (the only auto-redirect is the one-time post-signup
-- hop in lib/auth/actions.ts's signUpAction) — the split exists so a
-- later, deliberate touchpoint (e.g. a light "Termina tu Taste Profile"
-- nudge on /account) can tell "genuinely finished" apart from "chose not
-- to, for now" without re-interrupting anyone who already made either
-- choice. No other profile columns are needed for V1: identity display
-- already has display_name, discovery location already has
-- preferred_region, and there's no locale switcher yet to back a locale
-- column (the app is es-CR only end to end) — adding one now would be
-- speculative.
-- ---------------------------------------------------------------------------

alter table profiles add column taste_onboarding_completed_at timestamptz;
alter table profiles add column taste_onboarding_skipped_at timestamptz;

-- ---------------------------------------------------------------------------
-- Taste Profile — a small, generic, extensible preference-weight table
-- rather than a rigid taxonomy of dozens of columns/tables. `dimension` is
-- plain text (not an enum) specifically so a new kind of signal is an
-- application-level addition, not a schema migration — the app's
-- TypeScript union type is what currently constrains it to
-- 'category' | 'merchant' | 'interest' | 'aesthetic' (see
-- src/lib/marketplace/taste/types.ts). `value` is deliberately untyped
-- text for the same reason: its meaning depends on `dimension` (a Category
-- slug for 'category', a merchant id for 'merchant', an Interest identifier
-- for 'interest', an Aesthetic identifier for 'aesthetic' — both vocabularies
-- live in src/lib/marketplace/types.ts's INTEREST_VALUES/AESTHETIC_VALUES).
--
-- 'interest'/'aesthetic' are the two EXPLICIT dimensions onboarding and
-- Account's "Tus gustos" write; 'category'/'merchant' are now INFERRED-only,
-- learned from behavior — see recordAuthenticatedInteractionAction. Storing
-- them as free text rather than the marketplace's existing Category enum
-- is deliberate: a Taste Profile interest can exist with zero matching
-- catalog products today (e.g. "fitness", "gaming" — nothing in the V1
-- seed matches either), which is the entire point of Section 1's product
-- brief — a Taste Profile describes demand LUVI doesn't have inventory for
-- yet, not just a filter over what's already in stock.
--
-- `source` keeps explicit (onboarding / preferences-page picks) and
-- inferred (behavior-derived) weight for the same dimension+value as
-- SEPARATE rows, never merged into one number — this is what lets a user
-- edit their explicit picks later without silently deleting what their
-- behavior already taught LUVI, and vice versa (Phase 7 Section 16).
-- ---------------------------------------------------------------------------

create type preference_source as enum ('explicit', 'inferred');

create table taste_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  dimension text not null,
  value text not null,
  weight numeric not null default 1 check (weight >= 0),
  source preference_source not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, dimension, value, source)
);

create trigger taste_preferences_set_updated_at
  before update on taste_preferences
  for each row execute function set_updated_at();

create index taste_preferences_user_idx on taste_preferences (user_id);

alter table taste_preferences enable row level security;

create policy taste_preferences_select_own on taste_preferences
  for select
  to authenticated
  using (user_id = auth.uid());

create policy taste_preferences_insert_own on taste_preferences
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy taste_preferences_update_own on taste_preferences
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy taste_preferences_delete_own on taste_preferences
  for delete
  to authenticated
  using (user_id = auth.uid());

-- No policy for anon: fails closed, same convention as every other
-- authenticated-only table in 0002_rls.sql.

-- Atomic "add this much weight" upsert for inferred signals — a plain
-- .upsert() from the client can only overwrite a row, not add to its
-- existing weight, and a select-then-update round trip from the app would
-- race under concurrent events. Deliberately SECURITY INVOKER (the
-- default, no `security definer` here): it runs as the calling role, so
-- the existing insert/update RLS policies above still apply and already
-- guarantee a user can only touch their own rows — no extra check needed.
-- p_delta may be negative (e.g. an "unsave" nudging affinity back down —
-- Phase 7's "explicit negative" signal) — both branches clamp at 0 so a
-- string of negative deltas can never violate weight's `check (weight >= 0)`.
create or replace function public.increment_taste_weight(
  p_user_id uuid,
  p_dimension text,
  p_value text,
  p_source preference_source,
  p_delta numeric
)
returns void
language sql
as $$
  -- The update branch deliberately reads p_delta directly, NOT
  -- excluded.weight: excluded.weight is the already-clamped insert value
  -- (0 for any negative p_delta on a fresh row), so reading it back here
  -- would silently discard a negative delta instead of applying it against
  -- the existing weight.
  insert into taste_preferences (user_id, dimension, value, source, weight)
  values (p_user_id, p_dimension, p_value, p_source, greatest(p_delta, 0))
  on conflict (user_id, dimension, value, source)
  do update set weight = greatest(taste_preferences.weight + p_delta, 0), updated_at = now();
$$;

grant execute on function public.increment_taste_weight to authenticated;

-- ---------------------------------------------------------------------------
-- product_interests / product_aesthetics — the smallest structured
-- mechanism that lets a product participate in interest/aesthetic-based
-- recommendations (Phase 7 Taste Profile Section 3). Two narrow junction
-- tables rather than one wider "product_tags(kind, value)" table:
-- interest and aesthetic are conceptually different axes (what vs. how it
-- looks/feels — see the header note above), a product commonly has several
-- of one and few of the other, and keeping them separate means a query
-- for "products matching this aesthetic" never has to filter out interest
-- rows by a `kind` column. Deliberately NOT a comma-separated text column
-- on products: a normalized one-row-per-tag table is queryable/indexable
-- (`where interest = 'kawaii'`) and never needs string-parsing.
--
-- No insert/update/delete policy for anon/authenticated: same as every
-- other table in this schema, RLS enabled with no matching policy means
-- those roles simply can't write here — only service_role (server-only,
-- used for seeding today) can. There's no merchant-authored tagging UI in
-- this phase, so that's the correct, narrowest permission for now; a
-- later phase can add a merchant-scoped write policy the same way
-- products_write_member_or_admin already does for the products table.
-- ---------------------------------------------------------------------------

create table product_interests (
  product_id uuid not null references products (id) on delete cascade,
  interest text not null,
  primary key (product_id, interest)
);

create index product_interests_interest_idx on product_interests (interest);

alter table product_interests enable row level security;

-- Readable by whoever can already see the underlying product — same
-- public/member/admin boundary as products_select_public_or_member.
create policy product_interests_select_visible_product on product_interests
  for select
  using (
    exists (
      select 1 from products p
      where p.id = product_interests.product_id
        and (
          (p.status = 'active' and p.moderation_status = 'approved')
          or is_merchant_member(p.merchant_id)
          or is_admin()
        )
    )
  );

create table product_aesthetics (
  product_id uuid not null references products (id) on delete cascade,
  aesthetic text not null,
  primary key (product_id, aesthetic)
);

create index product_aesthetics_aesthetic_idx on product_aesthetics (aesthetic);

alter table product_aesthetics enable row level security;

create policy product_aesthetics_select_visible_product on product_aesthetics
  for select
  using (
    exists (
      select 1 from products p
      where p.id = product_aesthetics.product_id
        and (
          (p.status = 'active' and p.moderation_status = 'approved')
          or is_merchant_member(p.merchant_id)
          or is_admin()
        )
    )
  );

-- No changes to saved_products or product_interactions in this migration —
-- their uuid FKs to products(id)/merchants(id), as defined in
-- 0001_schema.sql, are preserved exactly. The application layer (Server
-- Actions in src/lib/marketplace/actions.ts and saved-products.ts) is
-- responsible for only ever writing real product/merchant UUIDs into them
-- now that the storefront reads the real Supabase catalog — see
-- src/lib/marketplace/legacy-id-migration.ts for how a pre-cutover local
-- save (an old mock id like "p1") is resolved to a real UUID or safely
-- dropped, rather than sent to the database at all.
