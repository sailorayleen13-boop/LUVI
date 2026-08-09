"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BackHeader } from "@/components/layout/back-header";
import { useCart } from "@/lib/store/cart-context";
import { useLocalStorageState } from "@/lib/store/use-local-storage";
import { formatCRC } from "@/lib/format";
import { resolveCartLines, splitByFulfillment, sumTotal, buildOrder, type Order } from "@/lib/order";

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, clearCart } = useCart();
  const [, setLastOrder] = useLocalStorageState<Order | null>("luvi:lastOrder", null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const resolved = resolveCartLines(lines);
  const { inStock, preorder } = splitByFulfillment(resolved);
  const total = sumTotal(resolved);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (resolved.length === 0) return;
    const order = buildOrder(resolved, { name, phone, address });
    setLastOrder(order);
    clearCart();
    router.push("/checkout/confirmacion");
  }

  if (resolved.length === 0) {
    return (
      <>
        <BackHeader title="Checkout" />
        <div className="flex flex-col items-center gap-3 px-8 py-24 text-center">
          <p className="font-display text-lg font-semibold text-charcoal">
            No tenés nada en el carrito
          </p>
          <p className="text-sm text-charcoal-faint">
            Agregá algo que vas a LUVI antes de hacer checkout.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <BackHeader title="Checkout" />

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 px-4 pb-6 pt-2">
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-[15px] font-semibold text-charcoal">
            Datos de entrega
          </h2>
          <div className="flex flex-col gap-2.5">
            <input
              type="text"
              required
              placeholder="Nombre completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl border border-charcoal/12 bg-white px-3.5 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:border-fucsia focus:outline-none"
            />
            <input
              type="tel"
              required
              placeholder="Teléfono"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-xl border border-charcoal/12 bg-white px-3.5 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:border-fucsia focus:outline-none"
            />
            <textarea
              required
              placeholder="Dirección de entrega"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="resize-none rounded-xl border border-charcoal/12 bg-white px-3.5 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:border-fucsia focus:outline-none"
            />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-[15px] font-semibold text-charcoal">
            Resumen del pedido
          </h2>

          {inStock.length > 0 && (
            <div className="flex flex-col gap-2 rounded-2xl bg-cream-soft p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-charcoal-faint">
                Disponible ahora · Envío inmediato
              </p>
              {inStock.map((line) => (
                <div key={line.product.id} className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="text-charcoal">
                    {line.product.name} <span className="text-charcoal-faint">x{line.quantity}</span>
                  </span>
                  <span className="flex-none font-medium text-charcoal">
                    {formatCRC(line.lineTotal)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {preorder.length > 0 && (
            <div className="flex flex-col gap-2 rounded-2xl bg-fucsia-light/60 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-fucsia-dark">
                Pre-order 💗
              </p>
              {preorder.map((line) => (
                <div key={line.product.id} className="flex flex-col gap-0.5 text-[13px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-charcoal">
                      {line.product.name} <span className="text-charcoal-faint">x{line.quantity}</span>
                    </span>
                    <span className="flex-none font-medium text-charcoal">
                      {formatCRC(line.lineTotal)}
                    </span>
                  </div>
                  {line.product.deliveryEstimate && (
                    <span className="text-[11.5px] text-fucsia-dark">
                      Entrega estimada: {line.product.deliveryEstimate}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-charcoal/8 pt-3">
            <span className="text-sm font-medium text-charcoal-soft">Total</span>
            <span className="font-display text-lg font-bold text-charcoal">
              {formatCRC(total)}
            </span>
          </div>
        </section>

        <button
          type="submit"
          className="flex w-full items-center justify-center rounded-full bg-fucsia py-3.5 text-[15px] font-semibold text-white shadow-md active:scale-[0.98]"
        >
          Confirmar pedido (simulado)
        </button>
        <p className="text-center text-[11px] text-charcoal-faint">
          Este es un checkout simulado — todavía no se procesan pagos reales.
        </p>
      </form>
    </>
  );
}
