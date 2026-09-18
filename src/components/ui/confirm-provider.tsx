"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Button } from "./button";
import { Card, CardBody } from "./card";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: "danger" | "primary";
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(value: boolean) => void>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function close(result: boolean) {
    resolver.current?.(result);
    setOptions(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" role="alertdialog" aria-modal="true">
          <Card className="w-full max-w-sm animate-reveal">
            <CardBody>
              <h2 className="font-display text-lg font-semibold">{options.title}</h2>
              {options.description && <p className="mt-2 text-sm text-muted">{options.description}</p>}
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => close(false)} autoFocus>
                  Cancel
                </Button>
                <Button variant={options.tone === "danger" ? "danger" : "primary"} onClick={() => close(true)}>
                  {options.confirmLabel ?? "Confirm"}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
