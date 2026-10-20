"use client";

import { createContext, useContext } from "react";
import type { SessionPublicState } from "@/lib/game/session-types";

type ApplyState = (state: SessionPublicState) => void;

/**
 * Every session action (pause, score, buzz, etc.) already returns the
 * fresh state its own write produced -- but without this, the only way
 * the UI learned about it was waiting for that same state to come back
 * over the realtime broadcast channel, a second network hop purely for
 * the person who just clicked the button. Applying the action's own
 * response immediately removes that extra round trip; the broadcast
 * still arrives moments later (harmless, same data) and is what other
 * viewers rely on.
 */
export const SessionStateContext = createContext<ApplyState | null>(null);

export function useApplyAuthoritativeState(): ApplyState | null {
  return useContext(SessionStateContext);
}
