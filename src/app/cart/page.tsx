"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { BackHeader } from "@/components/layout/back-header";
import { CartLineItem } from "@/components/cart/cart-line-item";
import { useCart } from "@/lib/store/cart-context";
import { formatCRC } from "@/lib/format";
import { resolveCartLines, splitByFulfillment, sumTotal } from "@/lib/order";

export default function CartPage() {
  const { lines, setQuantity, removeItem } = useCart();
  const resolved = resolveCartLines(lines);
  const { inStock, preorder } = splitByFulfillment(resolved);
  const total = sumTotal(resolved);

  if (resolved.length === 0) {
    return (
      <>
        <BackHeader title="Tu carrito" />
        <div className="flex flex-col items-center gap-4 px-8 py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-fucsia-light">
            <ShoppingBag size={26} className="text-fucsia-dark" />
          </div>
          <p className="font-display text-lg font-semibold text-charcoal">
            Tu carrito está vacío
          </p>
          <p className="text-sm text-charcoal-faint">
            Andá a descubrir algo que vas a LUVI 💗
          </p>
          <Link
            href="/"
            className="mt-2 rounded-full bg-fucsia px-6 py-3 text-sm font-semibold text-white shadow-md active:scale-95"
          >
            Ir a LUVI
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <BackHeader title="Tu carrito" />

      <main className="flex flex-col gap-6 px-4 pb-6 pt-2">
        {inStock.length > 0 && (
          <section className="flex flex-col gap-4">
            <h2 className="font-display text-[15px] font-semibold text-charcoal">
              Disponible ahora
            </h2>
            {inStock.map((line) => (
              <CartLineItem
                key={`${line.product.id}-in_stock`}
                product={line.product}
                quantity={line.quantity}
                fulfillmentType="in_stock"
                onQuantityChange={(next) => setQuantity(line.product.id, "in_stock", next)}
                onRemove={() => removeItem(line.product.id, "in_stock")}
              />
            ))}
            <div className="flex items-center justify-between border-t border-charcoal/8 pt-3 text-sm">
              <span className="text-charcoal-soft">Subtotal</span>
              <span className="font-semibold text-charcoal">{formatCRC(sumTotal(inStock))}</span>
            </div>
          </section>
        )}

        {preorder.length > 0 && (
          <section className="flex flex-col gap-4">
            <h2 className="font-display text-[15px] font-semibold text-charcoal">
              Pre-order 💗
            </h2>
            {preorder.map((line) => (
              <CartLineItem
                key={`${line.product.id}-preorder`}
                product={line.product}
                quantity={line.quantity}
                fulfillmentType="preorder"
                deliveryEstimate={line.product.deliveryEstimate}
                onQuantityChange={(next) => setQuantity(line.product.id, "preorder", next)}
                onRemove={() => removeItem(line.product.id, "preorder")}
              />
            ))}
            <div className="flex items-center justify-between border-t border-charcoal/8 pt-3 text-sm">
              <span className="text-charcoal-soft">Subtotal pre-order</span>
              <span className="font-semibold text-charcoal">{formatCRC(sumTotal(preorder))}</span>
            </div>
          </section>
        )}
      </main>

      <div
        className="sticky z-20 flex flex-col gap-3 border-t border-charcoal/8 bg-cream/95 px-4 py-3 backdrop-blur-sm"
        style={{ bottom: "calc(64px + env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-charcoal-soft">Total</span>
          <span className="font-display text-lg font-bold text-charcoal">
            {formatCRC(total)}
          </span>
        </div>
        {preorder.length > 0 && (
          <p className="text-[11.5px] text-charcoal-faint">
            Tu pedido incluye productos disponibles ahora y productos en pre-order — te contamos el detalle en el checkout.
          </p>
        )}
        <Link
          href="/checkout"
          className="flex w-full items-center justify-center rounded-full bg-fucsia py-3.5 text-[15px] font-semibold text-white shadow-md active:scale-[0.98]"
        >
          Continuar
        </Link>
      </div>
    </>
  );
}
