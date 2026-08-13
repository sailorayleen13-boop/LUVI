/**
 * es-CR dictionary. Generic customer-facing UI copy only — brand language
 * (LUVI, LUVI IT!, LUVI DROP) lives in src/lib/brand.ts and is never routed
 * through here, so it can't accidentally get "translated" later.
 *
 * Scoped to what Phase 2 actually renders (product card/detail, merchant
 * block, wishlist, outbound-click feedback). Nav/search/home copy gets
 * added when those surfaces are built, not pre-filled speculatively.
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
    pets: "Pet Finds",
    beauty: "Beauty",
    fashion: "Fashion",
    home: "Cute Finds",
    tech: "Tech & Desk",
    gifts: "Regalos",
    viral: "Viral Finds",
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
  },
} as const;
