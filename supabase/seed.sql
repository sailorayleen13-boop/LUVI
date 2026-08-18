-- LUVI — Phase 6 development seed.
--
-- Reproduces the current mock catalog (src/lib/marketplace/mock/*.ts) as
-- real rows, so local/dev Supabase looks like the live demo instead of an
-- empty database. This is the transition mechanism from mock -> real DB:
-- once src/lib/marketplace/queries.ts is repointed at Supabase (a later
-- phase), this seed is what makes that swap show the same storefront.
--
-- Not seeded here, intentionally:
--   - merchant_members — every merchant below has no owner yet. Ownership
--     only makes sense once a real auth user exists to own it; fabricating
--     an auth.users row here would create a login-less "ghost" account.
--     Linking a real signed-up user to one of these merchants is a Phase 7
--     onboarding-flow concern, not a seed concern.
--   - product_interactions — trending/most-LUVI'd for this seed intentionally
--     starts at zero real events rather than fabricating fake usage history;
--     src/lib/marketplace/mock/interactions.ts remains the source of
--     deterministic mock event data for as long as the UI still runs in
--     mock mode.
--   - seedPopularity / seedLuviCount — mock-only ranking seeds, not part of
--     the schema at all (see 0001_schema.sql's header comment).

-- ---------------------------------------------------------------------------
-- Merchants (mock/merchants.ts, m1–m7)
-- ---------------------------------------------------------------------------

insert into merchants (slug, name, logo, description, website, whatsapp, instagram, status, moderation_status, contact_email, created_at) values
  ('kawaii-cr', 'Kawaii CR', '🎀', 'Squishies y coleccionables kawaii traídos directo para Costa Rica.', null, 'https://wa.me/50688881111', 'https://instagram.com/kawaii.cr', 'active', 'approved', 'hola@kawaiicr.example', '2026-06-01'),
  ('petlovers-cr', 'PetLovers CR', '🐾', 'Accesorios y consentidos para tu mejor amigo de cuatro patas.', null, 'https://wa.me/50688882222', 'https://instagram.com/petlovers.cr', 'active', 'approved', 'hola@petloverscr.example', '2026-05-20'),
  ('casa-cute', 'Casa Cute', '🏠', 'Deco tierna para tu cuarto, depa o escritorio.', 'https://casacute.example.com', null, 'https://instagram.com/casacute.cr', 'active', 'approved', 'hola@casacute.example', '2026-06-10'),
  ('techdesk-cr', 'TechDesk CR', '🖥️', 'Accesorios de escritorio y tech para tu setup.', 'https://techdesk.example.com', 'https://wa.me/50688884444', null, 'active', 'approved', 'hola@techdeskcr.example', '2026-05-28'),
  ('viral-finds-cr', 'Viral Finds CR', '🌀', 'Los productos virales de TikTok que todos están buscando, disponibles localmente.', null, 'https://wa.me/50688885555', 'https://instagram.com/viralfinds.cr', 'active', 'approved', 'hola@viralfindscr.example', '2026-06-15'),
  ('glow-beauty-cr', 'Glow Beauty CR', '💄', 'Maquillaje y skincare coreano curado para el clima tico.', null, 'https://wa.me/50688886666', 'https://instagram.com/glowbeauty.cr', 'active', 'approved', 'hola@glowbeautycr.example', '2026-07-01'),
  ('uni-style-cr', 'Uni Style CR', '👜', 'Accesorios y básicos de moda para el día a día universitario.', 'https://unistyle.example.com', null, 'https://instagram.com/unistyle.cr', 'active', 'approved', 'hola@unistylecr.example', '2026-07-08');

-- ---------------------------------------------------------------------------
-- Merchant locations (one primary location per merchant, matching mock)
-- ---------------------------------------------------------------------------

insert into merchant_locations (merchant_id, country, region, city, is_primary)
select id, 'CR', region, city, true from (values
  ('kawaii-cr', 'San José', 'San José'),
  ('petlovers-cr', 'Heredia', 'Heredia'),
  ('casa-cute', 'San José', 'Escazú'),
  ('techdesk-cr', 'Cartago', 'Cartago'),
  ('viral-finds-cr', 'Alajuela', 'Alajuela'),
  ('glow-beauty-cr', 'San José', 'San José'),
  ('uni-style-cr', 'San José', 'Curridabat')
) as loc(slug, region, city)
join merchants m on m.slug = loc.slug;

-- ---------------------------------------------------------------------------
-- Products (mock/products.ts, p1–p19). badges are intentionally omitted —
-- they're derived at query time, never stored (see 0001_schema.sql).
-- ---------------------------------------------------------------------------

insert into products (
  merchant_id, slug, name, description, short_description, category, price, currency,
  availability, delivery_estimate, external_purchase_url, whatsapp_url, instagram_url,
  moderation_status, status, created_at, updated_at
)
select m.id, p.slug, p.name, p.description, p.short_description, p.category::product_category,
  p.price, 'CRC'::currency_code, p.availability::product_availability, p.delivery_estimate,
  p.external_purchase_url, p.whatsapp_url, p.instagram_url, 'approved'::moderation_status,
  'active'::product_status, p.created_at::timestamptz, p.updated_at::timestamptz
from (values
  ('kawaii-cr', 'squishy-frappuccino-gigante', 'Squishy Frappuccino Gigante', 'El squishy que se volvió viral en TikTok. Textura slow-rise ultra suave, huele a vainilla y es gigante.', 'Squishy jumbo de frappuccino, lento y súper suave.', 'squishies', 4500, 'IN_STOCK', null, null, null, 'https://wa.me/50688881111', '2026-08-01', '2026-08-06'),
  ('kawaii-cr', 'squishy-panda-kawaii', 'Squishy Panda Kawaii', 'Squishy de panda con carita kawaii, textura slow-rise y acabado súper suave.', 'El panda más tierno de tu colección.', 'squishies', 3800, 'IN_STOCK', null, null, null, 'https://instagram.com/kawaii.cr', '2026-07-15', '2026-07-20'),
  ('kawaii-cr', 'squishy-fresa-jumbo', 'Squishy Fresa Jumbo', 'Una fresa jumbo con aroma dulce y textura ultra lenta.', 'Fresa gigante, huele riquísimo.', 'squishies', 4200, 'IN_STOCK', null, null, null, null, '2026-06-28', '2026-07-02'),
  ('kawaii-cr', 'squishy-hamburguesa-mini-pack', 'Squishy Hamburguesa Mini Pack (x3)', 'Set de 3 squishies mini en forma de hamburguesa, papas y soda.', 'Pack de 3 mini hamburguesas squishy.', 'squishies', 3500, 'IN_STOCK', null, null, null, null, '2026-07-30', '2026-08-05'),
  ('kawaii-cr', 'squishy-avocado-suave', 'Squishy Avocado Suave', 'El aguacate más feliz que vas a tener. Squishy slow-rise con textura premium.', 'Aguacate squishy con carita feliz.', 'squishies', 3900, 'IN_STOCK', null, null, null, null, '2026-06-20', '2026-06-28'),
  ('kawaii-cr', 'squishy-luna-estrellas', 'Squishy Luna y Estrellas', 'Squishy luna con textura glow-in-the-dark. Kawaii CR reporta que se agotó por completo.', 'Edición limitada — Kawaii CR se quedó sin stock.', 'squishies', 4800, 'SOLD_OUT', null, null, null, null, '2026-07-28', '2026-08-08'),
  ('kawaii-cr', 'squishy-boba-tea-xl', 'Squishy Boba Tea XL', 'Squishy XL de boba tea con textura slow-rise premium. Kawaii CR lo tiene en preventa directa.', 'Kawaii CR está tomando preventas.', 'squishies', 5900, 'PREORDER', '7–12 días hábiles', null, 'https://wa.me/50688881111?text=Hola%2C%20quiero%20el%20squishy%20boba%20tea', null, '2026-08-05', '2026-08-09'),
  ('kawaii-cr', 'set-squishies-sanrio-style', 'Set Squishies Sanrio Style (x4)', 'Set de 4 mini squishies estilo kawaii japonés. Todavía no disponible para compra.', 'Kawaii CR lo tiene listado como próximo a llegar.', 'squishies', 6500, 'COMING_SOON', null, null, null, null, '2026-08-07', '2026-08-07'),
  ('petlovers-cr', 'correa-arcoiris-mascota', 'Correa Arcoíris para Mascota', 'Correa resistente y ajustable con estampado arcoíris.', 'Correa ajustable con diseño arcoíris.', 'pets', 6500, 'IN_STOCK', null, null, null, 'https://instagram.com/petlovers.cr', '2026-07-28', '2026-08-03'),
  ('petlovers-cr', 'cama-nube-mascota', 'Cama Nube para Mascota', 'Cama ultra suave en forma de nube con relleno acolchado.', 'Cama en forma de nube, súper cómoda.', 'pets', 12500, 'IN_STOCK', null, null, null, null, '2026-07-10', '2026-07-15'),
  ('casa-cute', 'lampara-luna-led', 'Lámpara de Luna LED', 'Lámpara LED con textura 3D de la superficie lunar, luz cálida regulable.', 'Lámpara 3D con textura lunar, recargable.', 'home', 8900, 'IN_STOCK', null, 'https://casacute.example.com/productos/lampara-luna-led', null, null, '2026-08-02', '2026-08-07'),
  ('techdesk-cr', 'organizador-escritorio-kawaii', 'Organizador de Escritorio Kawaii', 'Organizador de escritorio con compartimentos para lápices, celular y accesorios.', 'Organizador multiuso con diseño tierno.', 'tech', 7200, 'IN_STOCK', null, null, null, null, '2026-07-25', '2026-08-01'),
  ('techdesk-cr', 'funda-audifonos-oso', 'Funda de Audífonos Oso', 'Funda de silicona en forma de oso para proteger tu estuche de audífonos.', 'Funda tierna para tus audífonos inalámbricos.', 'tech', 5200, 'IN_STOCK', null, null, null, null, '2026-07-05', '2026-07-10'),
  ('viral-finds-cr', 'mini-ventilador-portatil-viral', 'Mini Ventilador Portátil Viral', 'Mini ventilador portátil recargable con 3 velocidades.', 'El ventilador que arrasó en redes.', 'viral', 6800, 'IN_STOCK', null, null, 'https://wa.me/50688885555?text=Hola%2C%20quiero%20el%20mini%20ventilador', null, '2026-08-03', '2026-08-08'),
  ('viral-finds-cr', 'mini-proyector-portatil-viral', 'Mini Proyector Portátil Viral', 'Mini proyector portátil recargable, ideal para noches de película.', 'Viral Finds CR reporta que se agotó.', 'viral', 9800, 'SOLD_OUT', null, null, null, null, '2026-07-20', '2026-07-25'),
  ('kawaii-cr', 'blind-box-mystery-figure', 'Blind Box Mystery Figure', 'Caja sorpresa con una figura coleccionable de la serie mystery box. No sabés cuál te toca hasta abrirla.', 'Figura coleccionable sorpresa, edición mystery box.', 'collectibles', 5400, 'IN_STOCK', null, null, null, 'https://instagram.com/kawaii.cr', '2026-08-04', '2026-08-04'),
  ('glow-beauty-cr', 'lip-tint-glow', 'Lip Tint Glow', 'Lip tint coreano de larga duración con acabado glossy. Un solo tono, multiuso.', 'Tinte labial con acabado glossy, larga duración.', 'beauty', 4900, 'IN_STOCK', null, null, 'https://wa.me/50688886666?text=Hola%2C%20quiero%20el%20lip%20tint', null, '2026-08-06', '2026-08-06'),
  ('uni-style-cr', 'bolso-crossbody-mini', 'Bolso Crossbody Mini', 'Bolso crossbody mini, liviano y con espacio justo para lo esencial.', 'Bolso pequeño cruzado, ideal para el día a día.', 'fashion', 11500, 'PREORDER', '5–8 días hábiles', null, null, 'https://instagram.com/unistyle.cr', '2026-08-08', '2026-08-09'),
  ('casa-cute', 'set-tarjetas-regalo-cute', 'Set Tarjetas de Regalo Cute', 'Set de 6 tarjetas de regalo con ilustraciones originales, sobre incluido.', 'Pack de 6 tarjetas ilustradas para cualquier ocasión.', 'gifts', 3600, 'IN_STOCK', null, 'https://casacute.example.com/productos/tarjetas-regalo-cute', null, null, '2026-08-02', '2026-08-02')
) as p(
  merchant_slug, slug, name, description, short_description, category, price, availability,
  delivery_estimate, external_purchase_url, whatsapp_url, instagram_url, created_at, updated_at
)
join merchants m on m.slug = p.merchant_slug;

-- ---------------------------------------------------------------------------
-- Product images — one emoji placeholder image per product, matching mock.
-- ---------------------------------------------------------------------------

insert into product_images (product_id, url, position)
select pr.id, img.url, 0
from (values
  ('squishy-frappuccino-gigante', '🥤'), ('squishy-panda-kawaii', '🐼'), ('squishy-fresa-jumbo', '🍓'),
  ('squishy-hamburguesa-mini-pack', '🍔'), ('squishy-avocado-suave', '🥑'), ('squishy-luna-estrellas', '🌙'),
  ('squishy-boba-tea-xl', '🧋'), ('set-squishies-sanrio-style', '🎀'), ('correa-arcoiris-mascota', '🐾'),
  ('cama-nube-mascota', '☁️'), ('lampara-luna-led', '🌕'), ('organizador-escritorio-kawaii', '🗂️'),
  ('funda-audifonos-oso', '🎧'), ('mini-ventilador-portatil-viral', '🌀'), ('mini-proyector-portatil-viral', '📽️'),
  ('blind-box-mystery-figure', '🎁'), ('lip-tint-glow', '💋'), ('bolso-crossbody-mini', '👜'),
  ('set-tarjetas-regalo-cute', '💌')
) as img(product_slug, url)
join products pr on pr.slug = img.product_slug;

-- ---------------------------------------------------------------------------
-- Drops (mock/drops.ts, d1–d4). Mock "active" -> published, "scheduled" ->
-- draft (not yet publicly visible, matching what "scheduled" meant in mock).
-- ---------------------------------------------------------------------------

insert into drops (slug, name, description, cover_emoji, status, published_at) values
  ('squishy-obsession', 'Squishy Obsession', 'Lo mejor de los squishies que están rompiendo internet ahora mismo.', '🧸', 'published', '2026-08-01'),
  ('pet-girl-summer', 'Pet Girl Summer', 'Todo para consentir a tu mejor amigo este verano.', '🐾', 'published', '2026-07-20'),
  ('trending-tiktok-finds', 'Trending TikTok Finds', 'Los productos virales que todos están buscando esta semana.', '📱', 'published', '2026-08-05'),
  ('back-to-uni', 'Back to Uni', 'Setup de escritorio y detalles cute para volver a clases.', '🎒', 'draft', '2026-09-01');

insert into drop_products (drop_id, product_id, position)
select d.id, pr.id, x.position
from (values
  ('squishy-obsession', 'squishy-frappuccino-gigante', 0),
  ('squishy-obsession', 'squishy-panda-kawaii', 1),
  ('squishy-obsession', 'squishy-luna-estrellas', 2),
  ('squishy-obsession', 'squishy-boba-tea-xl', 3),
  ('pet-girl-summer', 'correa-arcoiris-mascota', 0),
  ('pet-girl-summer', 'cama-nube-mascota', 1),
  ('trending-tiktok-finds', 'squishy-frappuccino-gigante', 0),
  ('trending-tiktok-finds', 'mini-ventilador-portatil-viral', 1),
  ('trending-tiktok-finds', 'mini-proyector-portatil-viral', 2),
  ('trending-tiktok-finds', 'lampara-luna-led', 3),
  ('back-to-uni', 'organizador-escritorio-kawaii', 0),
  ('back-to-uni', 'funda-audifonos-oso', 1),
  ('back-to-uni', 'lampara-luna-led', 2)
) as x(drop_slug, product_slug, position)
join drops d on d.slug = x.drop_slug
join products pr on pr.slug = x.product_slug;
