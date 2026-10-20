"use client";

import { useState } from "react";
import { useToast, friendlyError } from "@/components/ui/toast";
import { useApplyAuthoritativeState } from "@/lib/realtime/session-state-context";

/** Thin wrapper around a session API POST/PATCH call with toast-based error handling. */
export function useSessionAction(sessionId: string) {
  const [pending, setPending] = useState<string | null>(null);
  const toast = useToast();
  const applyState = useApplyAuthoritativeState();

  async function call(path: string, body?: unknown, method: "POST" | "PATCH" | "DELETE" = "POST") {
    setPending(path);
    try {
      const res = await fetch(`/api/sessions/${sessionId}${path}`, {
        method,
        headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      // Apply this action's own result immediately instead of waiting for
      // the realtime broadcast to echo it back -- same data, one less
      // network hop before the person who clicked sees it take effect.
      if (data?.state) applyState?.(data.state);
      return data;
    } catch (err) {
      toast.show(friendlyError(err), "error");
      throw err;
    } finally {
      setPending(null);
    }
  }

  return { call, pending };
}
