import { NextResponse } from "next/server";
import { ApiError, handleApiError, parseJson, requireHost } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSessionForHost, logEvent, publishState, playSound } from "@/lib/game/session-service";
import { assertTransition } from "@/lib/game/state-machine";
import { z } from "zod";

const schema = z.object({ sessionQuestionId: z.string().uuid() });

export async function POST(request: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params;
    const { user } = await requireHost();
    const admin = createAdminClient();
    const session = await requireSessionForHost(admin, sessionId, user.id);
    const { sessionQuestionId } = await parseJson(request, schema);

    const { data: question, error } = await admin
      .from("session_questions")
      .select("*")
      .eq("id", sessionQuestionId)
      .eq("session_id", sessionId)
      .maybeSingle();
    if (error) throw error;
    if (!question) throw new ApiError("Question not found.", 404);
    if (question.status === "completed") throw new ApiError("That question has already been completed.", 409);

    const targetStatus = question.is_final ? "final_question" : "question";
    assertTransition(session.status, targetStatus);

    const { error: updateError } = await admin
      .from("game_sessions")
      .update({
        status: targetStatus,
        current_session_question_id: sessionQuestionId,
        buzzers_open: false,
        buzzers_opened_at: null,
        active_team_id: null,
        timer_seconds: null,
        timer_started_at: null,
        previous_status: null,
      })
      .eq("id", sessionId);
    if (updateError) throw updateError;

    await admin.from("session_questions").update({ status: "selected" }).eq("id", sessionQuestionId);

    await logEvent(admin, sessionId, "question_selected", { sessionQuestionId, points: question.points });
    await playSound(sessionId, "question_selected");
    const state = await publishState(admin, sessionId);
    return NextResponse.json({ state });
  } catch (error) {
    return handleApiError(error);
  }
}
