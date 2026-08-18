"use client";

import { CartProvider } from "@/lib/store/cart-context";
import { WishlistProvider } from "@/lib/store/wishlist-context";
import { ToastProvider } from "@/lib/store/toast-context";
import { InterestProvider } from "@/lib/store/interest-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <WishlistProvider>
        <InterestProvider>
          <ToastProvider>{children}</ToastProvider>
        </InterestProvider>
      </WishlistProvider>
    </CartProvider>
  );
}
