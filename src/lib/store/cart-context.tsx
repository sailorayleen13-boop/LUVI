"use client";

import { createContext, useContext, useMemo } from "react";
import { useLocalStorageState } from "@/lib/store/use-local-storage";

export interface CartLine {
  productId: string;
  quantity: number;
}

interface CartContextValue {
  lines: CartLine[];
  itemCount: number;
  addItem: (productId: string, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useLocalStorageState<CartLine[]>("luvi:cart", []);

  const value = useMemo<CartContextValue>(() => {
    const addItem: CartContextValue["addItem"] = (productId, quantity = 1) => {
      setLines((current) => {
        const existing = current.find((l) => l.productId === productId);
        if (existing) {
          return current.map((l) =>
            l.productId === productId
              ? { ...l, quantity: l.quantity + quantity }
              : l,
          );
        }
        return [...current, { productId, quantity }];
      });
    };

    const setQuantity: CartContextValue["setQuantity"] = (productId, quantity) => {
      setLines((current) => {
        if (quantity <= 0) return current.filter((l) => l.productId !== productId);
        return current.map((l) =>
          l.productId === productId ? { ...l, quantity } : l,
        );
      });
    };

    const removeItem: CartContextValue["removeItem"] = (productId) => {
      setLines((current) => current.filter((l) => l.productId !== productId));
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
