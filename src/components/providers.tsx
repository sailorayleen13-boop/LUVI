"use client";

import { CartProvider } from "@/lib/store/cart-context";
import { WishlistProvider } from "@/lib/store/wishlist-context";
import { ToastProvider } from "@/lib/store/toast-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <WishlistProvider>
        <ToastProvider>{children}</ToastProvider>
      </WishlistProvider>
    </CartProvider>
  );
}
