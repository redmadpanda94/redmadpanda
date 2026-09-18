"use client";

import { useEffect } from "react";

/** Keeps the screen awake while mounted, where the browser supports it (spec section 36). */
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;

    async function acquire() {
      try {
        sentinel = await navigator.wakeLock.request("screen");
      } catch {
        // Wake lock can be denied (e.g. low battery) -- non-critical, ignore.
      }
    }

    function handleVisibility() {
      if (document.visibilityState === "visible" && !sentinel) acquire();
    }

    acquire();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      sentinel?.release().catch(() => {});
    };
  }, [enabled]);
}
