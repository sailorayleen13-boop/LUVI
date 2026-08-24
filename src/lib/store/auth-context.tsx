"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { setInteractionsUserId } from "@/lib/marketplace/interactions";

interface AuthContextValue {
  user: User | null;
  /** True only until the initial session check resolves — not a loading spinner trigger. */
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true });

/**
 * Lightweight client-side mirror of the auth session — NOT the source of
 * truth (that's always the server, via getCurrentUser()/RLS); this exists
 * so client components (BottomNav badge, the wishlist heart, interaction
 * tracking) can react to sign-in/out without each one hand-rolling its own
 * Supabase subscription. Also keeps interactions.ts's module-level user id
 * in sync (setInteractionsUserId) — see that file for why a plain module
 * variable, not prop-drilling, is the pragmatic choice there.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Never let a missing/misconfigured Supabase project throw here —
    // this effect runs on every page; an unhandled rejection would have
    // nothing to do with whatever the visitor is actually browsing.
    try {
      const supabase = createSupabaseBrowserClient();

      supabase.auth
        .getUser()
        .then(({ data }) => {
          setUser(data.user);
          setInteractionsUserId(data.user?.id ?? null);
          setLoading(false);
        })
        .catch(() => setLoading(false));

      const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        setInteractionsUserId(session?.user?.id ?? null);
      });

      return () => subscription.subscription.unsubscribe();
    } catch {
      // Deferred into a microtask so the setState happens in a callback,
      // not synchronously in the effect body — same rule as the .catch()
      // above, just for the synchronous-throw case (e.g. createBrowserClient
      // itself throwing when env vars are missing).
      void Promise.resolve().then(() => setLoading(false));
      return undefined;
    }
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
