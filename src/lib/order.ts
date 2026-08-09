import { getProductById } from "@/lib/queries";
import type { CartLine, FulfillmentType } from "@/lib/store/cart-context";
import type { Category, Product } from "@/lib/types";

export interface ResolvedCartLine {
  product: Product;
  quantity: number;
  fulfillmentType: FulfillmentType;
  lineTotal: number;
}

export function resolveCartLines(lines: CartLine[]): ResolvedCartLine[] {
  return lines.flatMap((line) => {
    const product = getProductById(line.productId);
    if (!product) return [];
    return [
      {
        product,
        quantity: line.quantity,
        fulfillmentType: line.fulfillmentType,
        lineTotal: product.price * line.quantity,
      },
    ];
  });
}

export function splitByFulfillment(lines: ResolvedCartLine[]) {
  return {
    inStock: lines.filter((l) => l.fulfillmentType === "in_stock"),
    preorder: lines.filter((l) => l.fulfillmentType === "preorder"),
  };
}

export function sumTotal(lines: ResolvedCartLine[]): number {
  return lines.reduce((sum, l) => sum + l.lineTotal, 0);
}

export interface OrderLine {
  productId: string;
  name: string;
  slug: string;
  emoji: string;
  category: Category;
  unitPrice: number;
  quantity: number;
  fulfillmentType: FulfillmentType;
  deliveryEstimate?: string;
}

export interface ShippingInfo {
  name: string;
  phone: string;
  address: string;
}

export interface Order {
  id: string;
  createdAt: string;
  lines: OrderLine[];
  subtotalInStock: number;
  subtotalPreorder: number;
  total: number;
  shipping: ShippingInfo;
}

/** Builds a mock order snapshot from the current cart. No real payment/procurement happens here. */
export function buildOrder(resolved: ResolvedCartLine[], shipping: ShippingInfo): Order {
  const lines: OrderLine[] = resolved.map((l) => ({
    productId: l.product.id,
    name: l.product.name,
    slug: l.product.slug,
    emoji: l.product.images[0],
    category: l.product.category,
    unitPrice: l.product.price,
    quantity: l.quantity,
    fulfillmentType: l.fulfillmentType,
    deliveryEstimate: l.product.deliveryEstimate,
  }));

  const { inStock, preorder } = splitByFulfillment(resolved);
  const subtotalInStock = sumTotal(inStock);
  const subtotalPreorder = sumTotal(preorder);

  return {
    id: `LUVI-${Math.floor(1000 + Math.random() * 9000)}`,
    createdAt: new Date().toISOString(),
    lines,
    subtotalInStock,
    subtotalPreorder,
    total: subtotalInStock + subtotalPreorder,
    shipping,
  };
}
