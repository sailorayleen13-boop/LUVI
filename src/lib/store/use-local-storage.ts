"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

type Listener = () => void;
type Updater<T> = T | ((current: T) => T);

const listeners = new Map<string, Set<Listener>>();
const cache = new Map<string, unknown>();

function readFromStorage<T>(key: string, initialValue: T): T {
  if (typeof window === "undefined") return initialValue;
  if (cache.has(key)) return cache.get(key) as T;
  let value = initialValue;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) value = JSON.parse(raw) as T;
  } catch {
    // ignore corrupt storage
  }
  cache.set(key, value);
  return value;
}

function writeToStorage<T>(key: string, value: T) {
  cache.set(key, value);
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
  listeners.get(key)?.forEach((listener) => listener());
}

/** Persists state to localStorage, synced across hooks subscribed to the same key. */
export function useLocalStorageState<T>(key: string, initialValue: T) {
  const initialRef = useRef(initialValue);

  const subscribe = useCallback(
    (onStoreChange: Listener) => {
      if (!listeners.has(key)) listeners.set(key, new Set());
      listeners.get(key)!.add(onStoreChange);
      return () => listeners.get(key)?.delete(onStoreChange);
    },
    [key],
  );

  const getSnapshot = useCallback(
    () => readFromStorage(key, initialRef.current),
    [key],
  );
  const getServerSnapshot = useCallback(() => initialRef.current, []);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback(
    (updater: Updater<T>) => {
      const current = readFromStorage(key, initialRef.current);
      const next =
        typeof updater === "function"
          ? (updater as (current: T) => T)(current)
          : updater;
      writeToStorage(key, next);
    },
    [key],
  );

  return [value, setValue] as const;
}
