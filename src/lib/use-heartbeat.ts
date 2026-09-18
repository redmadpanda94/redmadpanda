"use client";

import { useEffect } from "react";

/** Periodically tells the server this team's device is still here (spec section 37). */
export function useHeartbeat(sessionId: string, teamId: string | null, token: string | null) {
  useEffect(() => {
    if (!teamId || !token) return;

    function send(connected: boolean) {
      const body = JSON.stringify({ token, connected });
      const url = `/api/sessions/${sessionId}/teams/${teamId}/heartbeat`;
      if (!connected && navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      } else {
        fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
      }
    }

    send(true);
    const interval = setInterval(() => send(true), 20_000);

    function handleVisibility() {
      send(document.visibilityState === "visible");
    }
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", () => send(false));

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [sessionId, teamId, token]);
}
