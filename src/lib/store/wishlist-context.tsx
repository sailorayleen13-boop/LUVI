"use client";

import { createContext, useContext, useMemo } from "react";
import { useLocalStorageState } from "@/lib/store/use-local-storage";

interface WishlistContextValue {
  productIds: string[];
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (productId: string) => boolean;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [productIds, setProductIds] = useLocalStorageState<string[]>(
    "luvi:wishlist",
    [],
  );

  const value = useMemo<WishlistContextValue>(
    () => ({
      productIds,
      isWishlisted: (productId) => productIds.includes(productId),
      toggleWishlist: (productId) => {
        const nowWishlisted = !productIds.includes(productId);
        setProductIds((current) =>
          current.includes(productId)
            ? current.filter((id) => id !== productId)
            : [...current, productId],
        );
        return nowWishlisted;
      },
    }),
    [productIds, setProductIds],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
