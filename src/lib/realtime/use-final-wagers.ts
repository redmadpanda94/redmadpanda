"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { FinalWagerRow } from "@/types/database";

/** Host-only read of wager amounts (RLS-scoped) -- never exposed to team clients. */
export function useFinalWagers(sessionQuestionId: string | null | undefined) {
  const [wagers, setWagers] = useState<FinalWagerRow[]>([]);

  useEffect(() => {
    if (!sessionQuestionId) return;
    let active = true;
    const supabase = createClient();

    async function load() {
      const { data } = await supabase.from("final_wagers").select("*").eq("session_question_id", sessionQuestionId);
      if (active) setWagers(data ?? []);
    }
    load();
    const interval = setInterval(load, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [sessionQuestionId]);

  return wagers;
}
