"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

interface ToastState {
  id: number;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const id = Date.now();
    setToast({ id, message });
    timeoutRef.current = setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 2200);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div
          key={toast.id}
          className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] left-1/2 z-50 w-max max-w-[85%] -translate-x-1/2 animate-toast-in rounded-full bg-charcoal px-4 py-2.5 text-sm font-medium text-cream shadow-lg"
          role="status"
        >
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
