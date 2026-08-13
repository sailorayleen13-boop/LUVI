import type { Drop } from "@/lib/marketplace/types";

/**
 * Editorial/discovery collections. Each spans products from multiple
 * merchants — this is LUVI curating discovery, not LUVI owning inventory.
 * No close date: unlike the old procurement drops, there's no order to
 * consolidate before a deadline.
 */
export const drops: Drop[] = [
  {
    id: "d1",
    slug: "squishy-obsession",
    name: "Squishy Obsession",
    description: "Lo mejor de los squishies que están rompiendo internet ahora mismo.",
    coverEmoji: "🧸",
    productIds: ["p1", "p2", "p6", "p7"],
    status: "active",
    publishedAt: "2026-08-01",
  },
  {
    id: "d2",
    slug: "pet-girl-summer",
    name: "Pet Girl Summer",
    description: "Todo para consentir a tu mejor amigo este verano.",
    coverEmoji: "🐾",
    productIds: ["p9", "p10"],
    status: "active",
    publishedAt: "2026-07-20",
  },
  {
    id: "d3",
    slug: "trending-tiktok-finds",
    name: "Trending TikTok Finds",
    description: "Los productos virales que todos están buscando esta semana.",
    coverEmoji: "📱",
    productIds: ["p1", "p14", "p15", "p11"],
    status: "active",
    publishedAt: "2026-08-05",
  },
  {
    id: "d4",
    slug: "back-to-uni",
    name: "Back to Uni",
    description: "Setup de escritorio y detalles cute para volver a clases.",
    coverEmoji: "🎒",
    productIds: ["p12", "p13", "p11"],
    status: "scheduled",
    publishedAt: "2026-09-01",
  },
];
