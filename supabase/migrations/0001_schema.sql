-- LUVI — Phase 6 schema foundation.
--
-- Mirrors src/lib/marketplace/types.ts (public shape) plus the internal-only
-- fields already modeled as InternalMerchant/InternalProduct. Two things from
-- the mock layer are deliberately NOT columns here:
--   - seedPopularity / seedLuviCount (mock/products.ts) — mock-only ranking
--     seeds, replaced by aggregated product_interactions once real events
--     exist (see trending.ts's computeTrendingScores()).
--   - Product.badges ("trending" | "new") — derived at query time (trending
--     from computeTrendingScores(), "new" from createdAt), never stored.
--
-- Decision 1 (roles): there is no merchant flag on profiles. Merchant
-- capability is entirely determined by membership in merchant_members —
-- a user can be a customer, a merchant-member of one or more merchants, or
-- both at once. Admin is a separate, orthogonal flag on profiles.
--
-- Decision 2 (saved products): saved_products is authenticated-only by
-- design. Anonymous saves stay client-side (localStorage) — see
-- src/lib/store/wishlist-context.tsx — until a user signs in, at which point
-- src/lib/marketplace/supabase/saved-products.ts merges local IDs in.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type merchant_status as enum ('active', 'paused');
create type moderation_status as enum ('pending', 'approved', 'rejected');
create type merchant_member_role as enum ('owner', 'staff');

create type product_category as enum (
  'squishies', 'collectibles', 'pets', 'beauty', 'fashion',
  'home', 'tech', 'gifts', 'viral'
);
create type product_availability as enum ('IN_STOCK', 'PREORDER', 'COMING_SOON', 'SOLD_OUT');
create type product_status as enum ('active', 'archived');
-- CR-only today (matches CurrencyCode in types.ts) — a real enum so a second
-- country/currency is adding a value later, not restructuring a column.
create type currency_code as enum ('CRC');

create type drop_status as enum ('draft', 'published', 'archived');

create type interaction_type as enum (
  'product_view', 'search', 'save', 'unsave', 'luvi_it_click', 'store_view', 'interest'
);

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles — one row per auth user. No role=merchant here (Decision 1):
-- merchant capability comes from merchant_members membership, not this row.
-- ---------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  preferred_region text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- merchants
-- ---------------------------------------------------------------------------

create table merchants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  logo text,
  description text not null default '',
  website text,
  whatsapp text,
  instagram text,
  status merchant_status not null default 'active',
  moderation_status moderation_status not null default 'pending',
  -- Internal only — never selected by anon/public queries (see 0002_rls.sql).
  contact_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger merchants_set_updated_at
  before update on merchants
  for each row execute function set_updated_at();

create index merchants_status_moderation_idx on merchants (status, moderation_status);

-- ---------------------------------------------------------------------------
-- merchant_members — the sole source of merchant write authority (Decision 1)
-- ---------------------------------------------------------------------------

create table merchant_members (
  merchant_id uuid not null references merchants (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role merchant_member_role not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (merchant_id, user_id)
);

create index merchant_members_user_idx on merchant_members (user_id);

-- ---------------------------------------------------------------------------
-- merchant_locations — a merchant may have more than one (types.ts's
-- Location embedded on Merchant becomes this FK'd table).
-- ---------------------------------------------------------------------------

create table merchant_locations (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants (id) on delete cascade,
  country text not null default 'CR',
  region text,
  city text,
  address_optional text,
  is_primary boolean not null default true,
  created_at timestamptz not null default now()
);

create index merchant_locations_merchant_idx on merchant_locations (merchant_id);
-- At most one primary location per merchant.
create unique index merchant_locations_one_primary_idx
  on merchant_locations (merchant_id)
  where is_primary;

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------

create table products (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants (id) on delete cascade,
  slug text not null,
  name text not null,
  description text not null default '',
  short_description text not null default '',
  category product_category not null,
  price numeric(12, 2) not null check (price >= 0),
  currency currency_code not null default 'CRC',
  availability product_availability not null default 'IN_STOCK',
  delivery_estimate text,
  external_purchase_url text,
  whatsapp_url text,
  instagram_url text,
  moderation_status moderation_status not null default 'pending',
  status product_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, slug)
);

create trigger products_set_updated_at
  before update on products
  for each row execute function set_updated_at();

create index products_merchant_idx on products (merchant_id);
create index products_category_idx on products (category);
create index products_status_moderation_idx on products (status, moderation_status);
create index products_created_at_idx on products (created_at desc);

-- ---------------------------------------------------------------------------
-- product_images — normalizes Product.images: string[]
-- ---------------------------------------------------------------------------

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  -- Emoji placeholder today (same convention as the mock data), a real photo
  -- URL later — the column doesn't change either way.
  url text not null,
  position integer not null default 0,
  alt_text text,
  created_at timestamptz not null default now()
);

create index product_images_product_idx on product_images (product_id, position);

-- ---------------------------------------------------------------------------
-- drops — editorial collections, may span multiple merchants
-- ---------------------------------------------------------------------------

create table drops (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  cover_emoji text,
  status drop_status not null default 'draft',
  published_at timestamptz,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger drops_set_updated_at
  before update on drops
  for each row execute function set_updated_at();

create index drops_status_idx on drops (status);

create table drop_products (
  drop_id uuid not null references drops (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  position integer not null default 0,
  primary key (drop_id, product_id)
);

create index drop_products_product_idx on drop_products (product_id);

-- ---------------------------------------------------------------------------
-- product_interactions — the single event log behind trending/analytics
-- (mirrors ProductInteraction in types.ts). userId/sessionId are new versus
-- the mock shape: mock mode has no actor at all since everything lives in
-- one browser's localStorage.
-- ---------------------------------------------------------------------------

create table product_interactions (
  id uuid primary key default gen_random_uuid(),
  type interaction_type not null,
  product_id uuid references products (id) on delete cascade,
  merchant_id uuid references merchants (id) on delete cascade,
  category product_category,
  query text,
  region text,
  -- Authenticated actor, when known.
  user_id uuid references profiles (id) on delete set null,
  -- Anonymous browser session id (see wishlist/interactions localStorage
  -- convention) — set on every event so anonymous and authenticated
  -- activity from the same browser can be correlated later if ever needed.
  session_id text,
  created_at timestamptz not null default now()
);

create index product_interactions_product_created_idx
  on product_interactions (product_id, created_at desc);
create index product_interactions_type_created_idx
  on product_interactions (type, created_at desc);
create index product_interactions_merchant_idx on product_interactions (merchant_id);
create index product_interactions_user_idx on product_interactions (user_id);
create index product_interactions_session_idx on product_interactions (session_id);

-- ---------------------------------------------------------------------------
-- saved_products — authenticated-only (Decision 2). Anonymous saves are
-- never persisted here; they stay in localStorage until first login, at
-- which point the app merges local ids into this table (additive, never
-- destructive — see src/lib/marketplace/supabase/saved-products.ts).
-- ---------------------------------------------------------------------------

create table saved_products (
  user_id uuid not null references profiles (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index saved_products_user_idx on saved_products (user_id);
