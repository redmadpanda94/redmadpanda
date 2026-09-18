import { NextResponse } from "next/server";
import { handleApiError, requireHost } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSessionForHost, logEvent, publishState } from "@/lib/game/session-service";
import { assertTransition } from "@/lib/game/state-machine";

export async function POST(_request: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params;
    const { user } = await requireHost();
    const admin = createAdminClient();
    const session = await requireSessionForHost(admin, sessionId, user.id);

    assertTransition(session.status, "board");

    if (session.current_session_question_id) {
      await admin
        .from("session_questions")
        .update({ status: "completed" })
        .eq("id", session.current_session_question_id);
    }

    const { error } = await admin
      .from("game_sessions")
      .update({
        status: "board",
        current_session_question_id: null,
        buzzers_open: false,
        active_team_id: null,
        timer_seconds: null,
        timer_started_at: null,
      })
      .eq("id", sessionId);
    if (error) throw error;

    await logEvent(admin, sessionId, "question_closed", { sessionQuestionId: session.current_session_question_id });
    const state = await publishState(admin, sessionId);
    return NextResponse.json({ state });
  } catch (error) {
    return handleApiError(error);
  }
}
