"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SessionMediaRow, SessionQuestionRow } from "@/types/database";

export interface QuestionDetail {
  question: SessionQuestionRow;
  media: SessionMediaRow[];
}

/**
 * Host-only fetch of the full question (including answer_text) directly
 * from Postgres via the authenticated, RLS-scoped browser client. Never
 * goes through the public broadcast channel, so team clients have no path
 * to this data (spec section 68).
 */
export function useQuestionDetail(sessionQuestionId: string | null | undefined) {
  const [detail, setDetail] = useState<QuestionDetail | null>(null);

  useEffect(() => {
    // Callers gate rendering on the (redacted) currentQuestion from the
    // public state, so a stale `detail` lingering here after the id clears
    // is never actually shown -- no need to reset it synchronously.
    if (!sessionQuestionId) return;
    let active = true;
    const supabase = createClient();

    Promise.all([
      supabase.from("session_questions").select("*").eq("id", sessionQuestionId).maybeSingle(),
      supabase.from("session_media").select("*").eq("session_question_id", sessionQuestionId).order("position"),
    ]).then(([questionRes, mediaRes]) => {
      if (!active) return;
      if (questionRes.data) {
        setDetail({ question: questionRes.data, media: mediaRes.data ?? [] });
      }
    });

    return () => {
      active = false;
    };
  }, [sessionQuestionId]);

  return { detail };
}
