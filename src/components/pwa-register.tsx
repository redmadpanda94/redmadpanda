"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    // Only register in production. In dev, Next.js often reuses the same
    // static filenames across rebuilds (no content hash), so a cache-first
    // service worker would keep serving stale JS/env values after every
    // restart -- actively harmful while iterating, not just unnecessary.
    if (process.env.NODE_ENV !== "production") {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((reg) => reg.unregister());
        });
      }
      return;
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Non-critical -- the app works fully without the service worker.
      });
    }
  }, []);
  return null;
}
