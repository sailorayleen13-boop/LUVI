"use client";

import { CartProvider } from "@/lib/store/cart-context";
import { WishlistProvider } from "@/lib/store/wishlist-context";
import { ToastProvider } from "@/lib/store/toast-context";
import { InterestProvider } from "@/lib/store/interest-context";
import { AuthProvider } from "@/lib/store/auth-context";
import { AuthSync } from "@/components/account/auth-sync";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <InterestProvider>
            <ToastProvider>
              <AuthSync />
              {children}
            </ToastProvider>
          </InterestProvider>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}
