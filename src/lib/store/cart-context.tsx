"use client";

import { createContext, useContext, useMemo } from "react";
import { useLocalStorageState } from "@/lib/store/use-local-storage";

export type FulfillmentType = "in_stock" | "preorder";

export interface CartLine {
  productId: string;
  quantity: number;
  fulfillmentType: FulfillmentType;
}

interface CartContextValue {
  lines: CartLine[];
  itemCount: number;
  addItem: (productId: string, quantity?: number, fulfillmentType?: FulfillmentType) => void;
  setQuantity: (productId: string, fulfillmentType: FulfillmentType, quantity: number) => void;
  removeItem: (productId: string, fulfillmentType: FulfillmentType) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function sameLine(a: CartLine, productId: string, fulfillmentType: FulfillmentType) {
  return a.productId === productId && a.fulfillmentType === fulfillmentType;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useLocalStorageState<CartLine[]>("luvi:cart", []);

  const value = useMemo<CartContextValue>(() => {
    const addItem: CartContextValue["addItem"] = (
      productId,
      quantity = 1,
      fulfillmentType = "in_stock",
    ) => {
      setLines((current) => {
        const existing = current.find((l) => sameLine(l, productId, fulfillmentType));
        if (existing) {
          return current.map((l) =>
            sameLine(l, productId, fulfillmentType)
              ? { ...l, quantity: l.quantity + quantity }
              : l,
          );
        }
        return [...current, { productId, quantity, fulfillmentType }];
      });
    };

    const setQuantity: CartContextValue["setQuantity"] = (
      productId,
      fulfillmentType,
      quantity,
    ) => {
      setLines((current) => {
        if (quantity <= 0) {
          return current.filter((l) => !sameLine(l, productId, fulfillmentType));
        }
        return current.map((l) =>
          sameLine(l, productId, fulfillmentType) ? { ...l, quantity } : l,
        );
      });
    };

    const removeItem: CartContextValue["removeItem"] = (productId, fulfillmentType) => {
      setLines((current) => current.filter((l) => !sameLine(l, productId, fulfillmentType)));
    };

    const clearCart = () => setLines([]);

    return {
      lines,
      itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
      addItem,
      setQuantity,
      removeItem,
      clearCart,
    };
  }, [lines, setLines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
