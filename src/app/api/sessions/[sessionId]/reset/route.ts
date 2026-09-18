import { NextResponse } from "next/server";
import { handleApiError, requireHost } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSessionForHost, logEvent, publishState, applyScoreDelta } from "@/lib/game/session-service";

/** Resets scores, buzz history, and question progress -- keeps the same teams and join code. */
export async function POST(_request: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params;
    const { user } = await requireHost();
    const admin = createAdminClient();
    await requireSessionForHost(admin, sessionId, user.id);

    const { data: teams } = await admin.from("teams").select("id, score").eq("session_id", sessionId);
    for (const team of teams ?? []) {
      if (team.score !== 0) {
        await applyScoreDelta(admin, { sessionId, teamId: team.id, delta: -team.score, reason: "reset", note: "Session reset" });
      }
    }

    const { data: sessionQuestions } = await admin.from("session_questions").select("id").eq("session_id", sessionId);
    const questionIds = (sessionQuestions ?? []).map((q) => q.id);
    if (questionIds.length) {
      await admin.from("session_questions").update({ status: "available" }).in("id", questionIds);
      await admin.from("buzz_events").delete().in("session_question_id", questionIds);
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
        previous_status: null,
      })
      .eq("id", sessionId);
    if (error) throw error;

    await logEvent(admin, sessionId, "session_reset", {});
    const state = await publishState(admin, sessionId);
    return NextResponse.json({ state });
  } catch (error) {
    return handleApiError(error);
  }
}
