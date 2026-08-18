# LUVI

Tienda online mobile-first de productos virales curados (squishies, pet finds, cute home, tech/desk). "Luvi. Lo compré. Lo amé."

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS v4
- Datos 100% mock por ahora (`src/lib/mock`, `src/lib/queries.ts`) — sin backend conectado todavía

## Desarrollo

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000). El layout está optimizado para viewport mobile (~390px); en pantallas anchas se muestra centrado como un "app frame".

## Estructura

```
src/
  app/                    rutas (App Router)
  components/
    layout/               Header, BottomNav
    home/                 secciones de descubrimiento
    product/              ProductCard, badges, imagen placeholder
  lib/
    types.ts              modelo de datos + tablas de estilo por categoría/badge
    mock/products.ts      catálogo mock
    queries.ts            capa de acceso a datos (swap futuro a Supabase, misma firma)
    store/                contexts de cart / wishlist / toast (localStorage)
    format.ts             formateo de precios en colones (₡)
```

Cuando se conecte Supabase, solo cambian las implementaciones dentro de `queries.ts`.

## Deploy (preview en GitHub Pages)

El repo incluye `.github/workflows/deploy-pages.yml`: en cada push a
`claude/luvi-mobile-store-r5dm4w` construye un export estático
(`GITHUB_PAGES=true npm run build`, ver `next.config.ts`) y lo publica en
GitHub Pages. Requiere habilitarlo una vez en **Settings → Pages → Source:
GitHub Actions** del repo. Después de eso queda en
`https://sailorayleen13-boop.github.io/LUVI/`.

`next dev` / `next build` / `next start` normales (sin `GITHUB_PAGES=true`)
siguen siendo un build de servidor normal en la raíz — el export estático es
solo para este preview y habrá que revisitarlo cuando se conecte Supabase.
