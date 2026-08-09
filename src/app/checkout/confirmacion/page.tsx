"use client";

import Link from "next/link";
import { PartyPopper } from "lucide-react";
import { useLocalStorageState } from "@/lib/store/use-local-storage";
import { formatCRC } from "@/lib/format";
import type { Order } from "@/lib/order";

export default function OrderConfirmationPage() {
  const [order] = useLocalStorageState<Order | null>("luvi:lastOrder", null);

  if (!order) {
    return (
      <div className="flex flex-col items-center gap-3 px-8 py-24 text-center">
        <p className="font-display text-lg font-semibold text-charcoal">
          No encontramos ningún pedido reciente
        </p>
        <Link
          href="/"
          className="mt-2 rounded-full bg-fucsia px-6 py-3 text-sm font-semibold text-white shadow-md active:scale-95"
        >
          Volver a LUVI
        </Link>
      </div>
    );
  }

  return (
    <main className="flex flex-col gap-6 px-4 pb-8 pt-[calc(28px+env(safe-area-inset-top))]">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-fucsia-light">
          <PartyPopper size={28} className="text-fucsia-dark" />
        </div>
        <h1 className="font-display text-xl font-bold text-charcoal">
          ¡Pedido simulado! 🎉
        </h1>
        <p className="text-sm text-charcoal-faint">
          Order #{order.id}
        </p>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl bg-cream-soft p-4">
        {order.lines.map((line) => (
          <div
            key={`${line.productId}-${line.fulfillmentType}`}
            className="flex items-center gap-3 border-b border-charcoal/8 pb-3 last:border-0 last:pb-0"
          >
            <span className="text-2xl" aria-hidden>
              {line.emoji}
            </span>
            <div className="flex-1">
              <p className="text-[13.5px] font-medium text-charcoal">
                {line.name} <span className="text-charcoal-faint">x{line.quantity}</span>
              </p>
              {line.fulfillmentType === "in_stock" ? (
                <p className="text-[11.5px] font-semibold text-emerald-700">
                  IN STOCK · Envío inmediato
                </p>
              ) : (
                <p className="text-[11.5px] font-semibold text-fucsia-dark">
                  PRE-ORDER
                  {line.deliveryEstimate ? ` · Entrega estimada: ${line.deliveryEstimate}` : ""}
                </p>
              )}
            </div>
            <span className="flex-none text-[13px] font-medium text-charcoal">
              {formatCRC(line.unitPrice * line.quantity)}
            </span>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-1.5 rounded-2xl border border-charcoal/8 p-4 text-sm">
        {order.subtotalInStock > 0 && (
          <div className="flex items-center justify-between text-charcoal-soft">
            <span>Subtotal disponible ahora</span>
            <span>{formatCRC(order.subtotalInStock)}</span>
          </div>
        )}
        {order.subtotalPreorder > 0 && (
          <div className="flex items-center justify-between text-charcoal-soft">
            <span>Subtotal pre-order</span>
            <span>{formatCRC(order.subtotalPreorder)}</span>
          </div>
        )}
        <div className="mt-1 flex items-center justify-between border-t border-charcoal/8 pt-2 font-semibold text-charcoal">
          <span>Total</span>
          <span className="font-display text-base">{formatCRC(order.total)}</span>
        </div>
      </section>

      <section className="flex flex-col gap-1 rounded-2xl border border-charcoal/8 p-4 text-sm text-charcoal-soft">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-charcoal-faint">
          Entrega
        </p>
        <p className="text-charcoal">{order.shipping.name}</p>
        <p>{order.shipping.phone}</p>
        <p>{order.shipping.address}</p>
      </section>

      {order.subtotalPreorder > 0 && order.subtotalInStock > 0 && (
        <p className="rounded-xl bg-fucsia-light/60 px-3.5 py-3 text-[12.5px] leading-relaxed text-fucsia-dark">
          Tu pedido mezcla productos disponibles ahora y en pre-order — te avisamos apenas todo esté listo para el envío.
        </p>
      )}

      <Link
        href="/"
        className="flex w-full items-center justify-center rounded-full bg-fucsia py-3.5 text-[15px] font-semibold text-white shadow-md active:scale-[0.98]"
      >
        Volver a LUVI
      </Link>
    </main>
  );
}
