"use client";

import { createContext, useContext, useMemo } from "react";
import { useLocalStorageState } from "@/lib/store/use-local-storage";

interface InterestContextValue {
  /** Per-browser record of "I NEED THIS" clicks on COMING_SOON products. */
  hasInterest: (productId: string) => boolean;
  registerInterest: (productId: string) => void;
  /** Per-browser record of "NOTIFY ME" requests on SOLD_OUT products. */
  hasNotifyRequest: (productId: string) => boolean;
  registerNotify: (productId: string) => void;
}

const InterestContext = createContext<InterestContextValue | null>(null);

export function InterestProvider({ children }: { children: React.ReactNode }) {
  const [interestedIds, setInterestedIds] = useLocalStorageState<string[]>(
    "luvi:interest",
    [],
  );
  const [notifyIds, setNotifyIds] = useLocalStorageState<string[]>("luvi:notify", []);

  const value = useMemo<InterestContextValue>(
    () => ({
      hasInterest: (productId) => interestedIds.includes(productId),
      registerInterest: (productId) => {
        setInterestedIds((current) =>
          current.includes(productId) ? current : [...current, productId],
        );
      },
      hasNotifyRequest: (productId) => notifyIds.includes(productId),
      registerNotify: (productId) => {
        setNotifyIds((current) =>
          current.includes(productId) ? current : [...current, productId],
        );
      },
    }),
    [interestedIds, setInterestedIds, notifyIds, setNotifyIds],
  );

  return <InterestContext.Provider value={value}>{children}</InterestContext.Provider>;
}

export function useInterest() {
  const ctx = useContext(InterestContext);
  if (!ctx) throw new Error("useInterest must be used within InterestProvider");
  return ctx;
}
