/**
 * es-CR dictionary. Generic customer-facing UI copy only — brand language
 * (LUVI, LUVI IT!, LUVI DROP) lives in src/lib/brand.ts and is never routed
 * through here, so it can't accidentally get "translated" later.
 */
export const esCR = {
  availability: {
    IN_STOCK: "Disponible",
    PREORDER: "Preventa",
    COMING_SOON: "Próximamente",
    SOLD_OUT: "Agotado",
  },
  category: {
    squishies: "Squishies",
    collectibles: "Coleccionables",
    pets: "Mascotas",
    beauty: "Belleza",
    fashion: "Moda",
    home: "Hallazgos cute",
    tech: "Tecnología",
    gifts: "Regalos",
    viral: "Virales",
  },
  product: {
    deliveryEstimatePrefix: "Entrega estimada",
    relatedHeading: "También te puede LUVI",
    soldByPrefix: "Vendido por",
  },
  merchant: {
    viewStore: "Ver tienda",
    locationLabel: "Ubicación",
    productsHeading: "Productos de esta tienda",
    productCountSuffix: "productos",
  },
  wishlist: {
    added: "Agregado a tu LUVI List 💕",
    removed: "Se quitó de tu LUVI List",
  },
  outbound: {
    redirectingPrefix: "Te llevamos a",
    unavailable: "Este producto todavía no tiene un link de compra",
  },
  common: {
    back: "Volver",
    previous: "Anterior",
    next: "Siguiente",
  },
  country: {
    CR: "Costa Rica",
  },
  discovery: {
    tagline: "¿Qué vas a LUVI hoy?",
    trending: "🔥 Tendencias cerca de vos",
    newArrivals: "✨ Recién llegaron",
    mostLuvid: "💗 Los más LUVI'd",
    cuteFinds: "🎀 Hallazgos cute",
    storesHeading: "🏪 Tiendas que vas a LUVI",
  },
  nav: {
    home: "Inicio",
    explore: "Explorar",
    saved: "Guardados",
    stores: "Tiendas",
    account: "Cuenta",
  },
  search: {
    label: "Buscar",
    placeholder: "¿Qué estás buscando?",
    supportingCopy: "Buscá productos, tiendas o algo que viste por ahí 👀",
    storesHeading: "Tiendas",
    productsHeading: "Productos",
    emptySubtitle: "Probá con otra palabra o explorá las categorías.",
    resultsCount: (count: number, query: string) =>
      `${count} resultado${count === 1 ? "" : "s"} para "${query}"`,
    emptyTitle: (query: string) => `No encontramos nada para "${query}"`,
  },
  filters: {
    all: "Todas",
    category: "Categoría",
    availability: "Disponibilidad",
    region: "Ubicación",
    merchant: "Tienda",
    noResultsTitle: "No hay productos con estos filtros",
    noResultsSubtitle: "Probá quitando algún filtro.",
    resultsCount: (count: number) => `${count} resultado${count === 1 ? "" : "s"}`,
  },
  drops: {
    heading: "💫 LUVI Drops",
    includesPrefix: "Incluye productos de",
    merchantsSuffix: "tiendas",
  },
  saved: {
    heading: "Guardados",
    emptyTitle: "Tu LUVI List está vacía",
    emptySubtitle: "Guardá los productos que más te gusten para encontrarlos rápido.",
    emptyCta: "Ir a LUVI",
  },
  stores: {
    heading: "Tiendas",
    subtitle: "Descubrí las tiendas locales en LUVI.",
  },
  explore: {
    heading: "Explorar",
    subtitle: "Buscá por categoría lo que quieras LUVI.",
  },
  account: {
    heading: "Cuenta",
    comingSoonTitle: "Tu cuenta LUVI está en camino",
    comingSoonSubtitle:
      "Pronto vas a poder crear tu cuenta, guardar tus datos y ver tu actividad en LUVI.",
  },
} as const;
