import "server-only";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/supabase/env";
import type { SessionRealtimeEvent } from "@/lib/game/session-types";

export function sessionChannelTopic(sessionId: string): string {
  return `session:${sessionId}`;
}

/**
 * Sends a Realtime Broadcast message via Supabase's stateless REST
 * endpoint (no persistent websocket needed server-side -- ideal for
 * serverless route handlers). `private: false` because the payload is
 * already redacted to be safe for anonymous team clients; the channel name
 * itself is only known to people with the session's join code/URL.
 */
export async function broadcastToSession(sessionId: string, message: SessionRealtimeEvent): Promise<void> {
  const url = `${getSupabaseUrl()}/realtime/v1/api/broadcast`;
  const key = getSupabaseServiceRoleKey();

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        messages: [
          {
            topic: sessionChannelTopic(sessionId),
            event: message.event,
            payload: message.payload,
            private: false,
          },
        ],
      }),
    });
    if (!res.ok) {
      console.error("Realtime broadcast failed", res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.error("Realtime broadcast error", err);
  }
}
