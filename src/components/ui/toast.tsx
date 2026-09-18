"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Toast {
  id: number;
  message: string;
  tone: "info" | "success" | "error";
}

interface ToastContextValue {
  show: (message: string, tone?: Toast["tone"]) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let idCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, tone: Toast["tone"] = "info") => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "animate-float-in rounded-xl border px-4 py-3 text-sm shadow-xl backdrop-blur-md",
              t.tone === "error" && "bg-danger/15 border-danger/40 text-danger",
              t.tone === "success" && "bg-success/15 border-success/40 text-success",
              t.tone === "info" && "bg-background-card border-border text-foreground"
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

/** Maps a caught error to a safe, user-facing message (spec section 50). */
export function friendlyError(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof Error && error.message && error.message.length < 200) {
    return error.message;
  }
  return fallback;
}
