import type { Product } from "@/lib/types";
import { formatCRC } from "@/lib/format";

export type CtaKind = "add-to-cart" | "preorder" | "interest" | "notify";

export interface AvailabilityPresentation {
  showPill: boolean;
  pillLabel: string;
  pillClassName: string;
  /** Big headline for the product detail page, e.g. "SOLD OUT 🔥". */
  headline: string;
  /** Short supporting lines for the detail page's availability panel. */
  supportingLines: string[];
  /** Single line for the compact card. */
  cardMicroCopy?: string;
  ctaLabel: string;
  ctaKind: CtaKind;
  /** Whether the compact quick-add button should render on the card. */
  showQuickAdd: boolean;
  /** Whether the card image should look faded/unavailable. */
  faded: boolean;
}

export function getAvailabilityPresentation(product: Product): AvailabilityPresentation {
  const price = formatCRC(product.price);
  const reserveLine =
    product.availableToReserve !== undefined
      ? `${product.availableToReserve} disponibles para reservar`
      : undefined;

  switch (product.availability) {
    case "IN_STOCK": {
      const lines = ["Disponible ahora", "Entrega rápida"];
      if (product.lowStockRemaining) lines.push(`Solo quedan ${product.lowStockRemaining} 👀`);
      return {
        showPill: false,
        pillLabel: "",
        pillClassName: "",
        headline: "IN STOCK 💗",
        supportingLines: lines,
        cardMicroCopy: product.lowStockRemaining
          ? `Solo quedan ${product.lowStockRemaining} 👀`
          : undefined,
        ctaLabel: `LUVI IT! — ${price}`,
        ctaKind: "add-to-cart",
        showQuickAdd: true,
        faded: false,
      };
    }

    case "PREORDER": {
      const lines = ["Parte del próximo LUVI Drop 💗"];
      if (product.deliveryEstimate) lines.push(`Entrega estimada: ${product.deliveryEstimate}`);
      if (reserveLine) lines.push(reserveLine);
      return {
        showPill: true,
        pillLabel: "Pre-order 💗",
        pillClassName: "bg-fucsia-light text-fucsia-dark",
        headline: "PRE-ORDER 💗",
        supportingLines: lines,
        cardMicroCopy: product.deliveryEstimate
          ? `Pre-order · ${product.deliveryEstimate}`
          : "Pre-order abierto",
        ctaLabel: `PRE-ORDER — ${price}`,
        ctaKind: "preorder",
        showQuickAdd: true,
        faded: false,
      };
    }

    case "SOLD_OUT_PREORDER": {
      const lines = ["¿Te lo perdiste? Reservá el tuyo del próximo restock."];
      if (product.restockBatchLabel) lines.push(`${product.restockBatchLabel.toUpperCase()} INCOMING ✈️`);
      if (product.deliveryEstimate) lines.push(`Entrega estimada: ${product.deliveryEstimate}`);
      if (reserveLine) lines.push(reserveLine);
      return {
        showPill: true,
        pillLabel: "Agotado 🔥",
        pillClassName: "bg-charcoal text-cream",
        headline: "SOLD OUT 🔥",
        supportingLines: lines,
        cardMicroCopy: product.deliveryEstimate
          ? `Pre-order · Restock ${product.deliveryEstimate}`
          : "Pre-order disponible",
        ctaLabel: `PRE-ORDER — ${price}`,
        ctaKind: "preorder",
        showQuickAdd: true,
        faded: true,
      };
    }

    case "COMING_SOON":
      return {
        showPill: true,
        pillLabel: "Muy pronto 👀",
        pillClassName: "bg-violet-100 text-violet-800",
        headline: "COMING SOON 👀",
        supportingLines: ["Todavía lo estamos probando — contanos si te gusta."],
        cardMicroCopy: "Muy pronto",
        ctaLabel: "I NEED THIS 💗",
        ctaKind: "interest",
        showQuickAdd: false,
        faded: false,
      };

    case "SOLD_OUT":
      return {
        showPill: true,
        pillLabel: "Agotado",
        pillClassName: "bg-charcoal/10 text-charcoal-soft",
        headline: "SOLD OUT",
        supportingLines: [
          "Se agotó por completo y todavía no tenemos fecha de restock.",
          "Dejanos tu contacto y te avisamos apenas vuelva.",
        ],
        cardMicroCopy: "Agotado",
        ctaLabel: "NOTIFY ME",
        ctaKind: "notify",
        showQuickAdd: false,
        faded: true,
      };
  }
}
