"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
}

function getTimeLeft(closeDate: string): TimeLeft | null {
  const diffMs = new Date(closeDate).getTime() - Date.now();
  if (diffMs <= 0) return null;
  const totalMinutes = Math.floor(diffMs / 60000);
  return {
    days: Math.floor(totalMinutes / (60 * 24)),
    hours: Math.floor((totalMinutes % (60 * 24)) / 60),
    minutes: totalMinutes % 60,
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function subscribe(onStoreChange: () => void) {
  const id = setInterval(onStoreChange, 30_000);
  return () => clearInterval(id);
}

/** Real countdown to a drop's order-consolidation deadline — never fabricated. */
export function DropCountdown({ closeDate, label }: { closeDate: string; label: string }) {
  // useSyncExternalStore requires a stable snapshot reference between calls
  // unless the value actually changed — cache by minute so we don't hand it
  // a new object every render (which would loop).
  const cacheRef = useRef<{ key: string; value: TimeLeft | null }>({
    key: "",
    value: null,
  });

  const getSnapshot = useCallback(() => {
    const next = getTimeLeft(closeDate);
    const key = next ? `${next.days}:${next.hours}:${next.minutes}` : "none";
    if (cacheRef.current.key !== key) {
      cacheRef.current = { key, value: next };
    }
    return cacheRef.current.value;
  }, [closeDate]);

  // Server snapshot is always null (Date.now() isn't meaningful pre-hydration);
  // the real value appears right after mount, avoiding a hydration mismatch.
  const getServerSnapshot = useCallback(() => null, []);

  const timeLeft = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!timeLeft) return null;

  return (
    <div className="rounded-xl bg-charcoal px-3 py-2 text-cream">
      <p className="text-[10.5px] font-medium uppercase tracking-wide text-cream/70">
        {label}
      </p>
      <p className="font-display text-base font-semibold">
        {pad(timeLeft.days)}d {pad(timeLeft.hours)}h {pad(timeLeft.minutes)}m
      </p>
    </div>
  );
}
