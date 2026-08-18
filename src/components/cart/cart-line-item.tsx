"use client";

import Link from "next/link";
import { X } from "lucide-react";
import type { Product } from "@/lib/types";
import type { FulfillmentType } from "@/lib/store/cart-context";
import { formatCRC } from "@/lib/format";
import { ProductImage } from "@/components/product/product-image";
import { QuantityStepper } from "@/components/ui/quantity-stepper";

export function CartLineItem({
  product,
  quantity,
  fulfillmentType,
  deliveryEstimate,
  onQuantityChange,
  onRemove,
}: {
  product: Product;
  quantity: number;
  fulfillmentType: FulfillmentType;
  deliveryEstimate?: string;
  onQuantityChange: (next: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex gap-3">
      <Link href={`/p/${product.slug}`} className="flex-none">
        <ProductImage
          emoji={product.images[0]}
          category={product.category}
          className="h-20 w-20"
        />
      </Link>

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/p/${product.slug}`} className="line-clamp-2 text-[13.5px] font-medium text-charcoal">
            {product.name}
          </Link>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Quitar del carrito"
            className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-charcoal-faint active:bg-charcoal/5"
          >
            <X size={15} />
          </button>
        </div>

        {fulfillmentType === "preorder" && deliveryEstimate && (
          <p className="text-[11.5px] font-medium text-fucsia-dark">
            Pre-order · Entrega estimada: {deliveryEstimate}
          </p>
        )}

        <div className="mt-1 flex items-center justify-between">
          <span className="font-display text-[14px] font-semibold text-charcoal">
            {formatCRC(product.price)}
          </span>
          <QuantityStepper quantity={quantity} onChange={onQuantityChange} />
        </div>
      </div>
    </div>
  );
}
