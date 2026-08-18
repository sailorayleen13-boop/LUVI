"use client";

import { Minus, Plus } from "lucide-react";

export function QuantityStepper({
  quantity,
  onChange,
  min = 1,
  max,
}: {
  quantity: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-charcoal/12 px-1 py-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, quantity - 1))}
        disabled={quantity <= min}
        aria-label="Restar cantidad"
        className="flex h-8 w-8 items-center justify-center rounded-full active:bg-charcoal/5 disabled:opacity-30"
      >
        <Minus size={16} />
      </button>
      <span className="w-5 text-center text-sm font-semibold text-charcoal">
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => onChange(max !== undefined ? Math.min(max, quantity + 1) : quantity + 1)}
        disabled={max !== undefined && quantity >= max}
        aria-label="Sumar cantidad"
        className="flex h-8 w-8 items-center justify-center rounded-full active:bg-charcoal/5 disabled:opacity-30"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
