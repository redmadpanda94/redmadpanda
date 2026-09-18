"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GameEventRow } from "@/types/database";

/** Host-only, RLS-scoped read of the session's event log (spec section 61). */
export function useGameEvents(sessionId: string, open: boolean) {
  const [events, setEvents] = useState<GameEventRow[]>([]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const supabase = createClient();

    async function load() {
      const { data } = await supabase
        .from("game_events")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (active) setEvents(data ?? []);
    }
    load();
    const interval = setInterval(load, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [sessionId, open]);

  return events;
}
