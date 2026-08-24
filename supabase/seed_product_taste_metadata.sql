-- LUVI — Taste Profile product metadata seed.
--
-- Populates product_interests / product_aesthetics (0003_taste_profile.sql)
-- for the 19 products supabase/seed.sql already inserted. Kept as its OWN
-- file, separate from seed.sql, because seed.sql has already been run
-- against the real project — re-running it would duplicate merchants/
-- products. This file only inserts into the two NEW tables and is safe to
-- run against that same database: every insert targets an existing
-- product by slug and is idempotent (`on conflict do nothing`), so running
-- it twice is harmless.
--
-- Run this AFTER 0003_taste_profile.sql has been applied and AFTER
-- seed.sql (so the products referenced below already exist).
--
-- Mappings below are the real judgment call, not filler: every value
-- reflects something actually true about the product (a squishy shaped
-- like food gets "food" as an interest; a plain accessory doesn't get
-- "luxury" just to cover the vocabulary). "skincare", "fitness", and
-- "luxury" intentionally have ZERO matches in this seed — nothing in the
-- current 19-product catalog fits them, and Section 1 of the Taste
-- Profile brief is explicit that that's fine: the Taste Profile can
-- represent demand LUVI doesn't have inventory for yet.

insert into product_interests (product_id, interest)
select p.id, v.interest
from products p
join (
  values
    ('squishy-frappuccino-gigante', 'kawaii'),
    ('squishy-frappuccino-gigante', 'food'),
    ('squishy-panda-kawaii', 'kawaii'),
    ('squishy-fresa-jumbo', 'kawaii'),
    ('squishy-fresa-jumbo', 'food'),
    ('squishy-hamburguesa-mini-pack', 'kawaii'),
    ('squishy-hamburguesa-mini-pack', 'food'),
    ('squishy-avocado-suave', 'kawaii'),
    ('squishy-avocado-suave', 'food'),
    ('squishy-luna-estrellas', 'kawaii'),
    ('squishy-boba-tea-xl', 'kawaii'),
    ('squishy-boba-tea-xl', 'food'),
    ('set-squishies-sanrio-style', 'kawaii'),
    ('correa-arcoiris-mascota', 'pets'),
    ('correa-arcoiris-mascota', 'accessories'),
    ('cama-nube-mascota', 'pets'),
    ('cama-nube-mascota', 'home'),
    ('lampara-luna-led', 'home'),
    ('lampara-luna-led', 'tech'),
    ('organizador-escritorio-kawaii', 'tech'),
    ('organizador-escritorio-kawaii', 'home'),
    ('organizador-escritorio-kawaii', 'kawaii'),
    ('organizador-escritorio-kawaii', 'accessories'),
    ('funda-audifonos-oso', 'tech'),
    ('funda-audifonos-oso', 'kawaii'),
    ('funda-audifonos-oso', 'accessories'),
    ('mini-ventilador-portatil-viral', 'tech'),
    ('mini-ventilador-portatil-viral', 'travel'),
    ('mini-ventilador-portatil-viral', 'accessories'),
    ('mini-proyector-portatil-viral', 'tech'),
    ('mini-proyector-portatil-viral', 'travel'),
    ('blind-box-mystery-figure', 'kawaii'),
    ('blind-box-mystery-figure', 'gaming'),
    ('lip-tint-glow', 'beauty'),
    ('bolso-crossbody-mini', 'fashion'),
    ('bolso-crossbody-mini', 'accessories'),
    ('set-tarjetas-regalo-cute', 'home'),
    ('set-tarjetas-regalo-cute', 'kawaii')
) as v(slug, interest) on v.slug = p.slug
on conflict (product_id, interest) do nothing;

insert into product_aesthetics (product_id, aesthetic)
select p.id, v.aesthetic
from products p
join (
  values
    ('squishy-frappuccino-gigante', 'cute'),
    ('squishy-frappuccino-gigante', 'colorful'),
    ('squishy-panda-kawaii', 'cute'),
    ('squishy-panda-kawaii', 'colorful'),
    ('squishy-fresa-jumbo', 'cute'),
    ('squishy-fresa-jumbo', 'colorful'),
    ('squishy-hamburguesa-mini-pack', 'cute'),
    ('squishy-hamburguesa-mini-pack', 'colorful'),
    ('squishy-hamburguesa-mini-pack', 'trendy'),
    ('squishy-avocado-suave', 'cute'),
    ('squishy-avocado-suave', 'cozy'),
    ('squishy-avocado-suave', 'colorful'),
    ('squishy-luna-estrellas', 'cute'),
    ('squishy-luna-estrellas', 'colorful'),
    ('squishy-boba-tea-xl', 'cute'),
    ('squishy-boba-tea-xl', 'trendy'),
    ('squishy-boba-tea-xl', 'colorful'),
    ('set-squishies-sanrio-style', 'cute'),
    ('set-squishies-sanrio-style', 'girly'),
    ('set-squishies-sanrio-style', 'colorful'),
    ('correa-arcoiris-mascota', 'colorful'),
    ('correa-arcoiris-mascota', 'trendy'),
    ('cama-nube-mascota', 'cozy'),
    ('cama-nube-mascota', 'cute'),
    ('cama-nube-mascota', 'clean'),
    ('lampara-luna-led', 'minimal'),
    ('lampara-luna-led', 'cozy'),
    ('lampara-luna-led', 'clean'),
    ('organizador-escritorio-kawaii', 'cute'),
    ('organizador-escritorio-kawaii', 'clean'),
    ('organizador-escritorio-kawaii', 'minimal'),
    ('funda-audifonos-oso', 'cute'),
    ('funda-audifonos-oso', 'girly'),
    ('funda-audifonos-oso', 'colorful'),
    ('mini-ventilador-portatil-viral', 'minimal'),
    ('mini-ventilador-portatil-viral', 'trendy'),
    ('mini-ventilador-portatil-viral', 'clean'),
    ('mini-proyector-portatil-viral', 'minimal'),
    ('mini-proyector-portatil-viral', 'trendy'),
    ('mini-proyector-portatil-viral', 'clean'),
    ('blind-box-mystery-figure', 'cute'),
    ('blind-box-mystery-figure', 'trendy'),
    ('blind-box-mystery-figure', 'colorful'),
    ('lip-tint-glow', 'girly'),
    ('lip-tint-glow', 'clean'),
    ('lip-tint-glow', 'trendy'),
    ('bolso-crossbody-mini', 'minimal'),
    ('bolso-crossbody-mini', 'trendy'),
    ('bolso-crossbody-mini', 'streetwear'),
    ('set-tarjetas-regalo-cute', 'cute'),
    ('set-tarjetas-regalo-cute', 'girly'),
    ('set-tarjetas-regalo-cute', 'colorful')
) as v(slug, aesthetic) on v.slug = p.slug
on conflict (product_id, aesthetic) do nothing;
