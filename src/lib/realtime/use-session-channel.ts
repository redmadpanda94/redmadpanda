"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SessionPublicState, SoundCue } from "@/lib/game/session-types";

export type ConnectionStatus = "connecting" | "connected" | "reconnecting";

export function useSessionChannel(sessionId: string, onSound?: (cue: SoundCue) => void) {
  const [state, setState] = useState<SessionPublicState | null>(null);
  const [connection, setConnection] = useState<ConnectionStatus>("connecting");
  const onSoundRef = useRef(onSound);
  useEffect(() => {
    onSoundRef.current = onSound;
  }, [onSound]);

  useEffect(() => {
    let active = true;

    fetch(`/api/sessions/${sessionId}/state`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data) setState(data);
      })
      .catch(() => {});

    const supabase = createClient();
    const channel = supabase.channel(`session:${sessionId}`, { config: { broadcast: { self: true } } });

    channel.on("broadcast", { event: "state" }, ({ payload }) => {
      if (active) setState(payload as SessionPublicState);
    });
    channel.on("broadcast", { event: "sound" }, ({ payload }) => {
      onSoundRef.current?.((payload as { cue: SoundCue }).cue);
    });

    channel.subscribe((status) => {
      if (!active) return;
      if (status === "SUBSCRIBED") setConnection("connected");
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        setConnection("reconnecting");
      }
    });

    // Realtime broadcast can occasionally drop a message; a light poll keeps
    // both host and team views eventually-consistent without hammering the API.
    const poll = setInterval(() => {
      fetch(`/api/sessions/${sessionId}/state`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (active && data) setState(data);
        })
        .catch(() => {});
    }, 8000);

    return () => {
      active = false;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return { state, connection };
}
