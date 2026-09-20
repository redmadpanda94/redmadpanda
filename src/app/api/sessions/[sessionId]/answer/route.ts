import { NextResponse } from "next/server";
import { ApiError, handleApiError, parseJson, requireHost } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSessionForHost, logEvent, publishState, playSound, applyScoreDelta } from "@/lib/game/session-service";
import { assertTransition } from "@/lib/game/state-machine";
import { computeAnswerDelta } from "@/lib/game/scoring";
import { answerOutcomeSchema } from "@/lib/validation/schemas";

/**
 * Core "incorrect answer progression" flow (spec section 19): scores the
 * selected team, marks their buzz (if any) resolved, and clears the active
 * team so the host must explicitly pick the next team from the remaining
 * queue -- never advances automatically.
 */
export async function POST(request: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params;
    const { user } = await requireHost();
    const admin = createAdminClient();
    const session = await requireSessionForHost(admin, sessionId, user.id);
    const { teamId, outcome } = await parseJson(request, answerOutcomeSchema);

    if (session.status !== "answering" || session.active_team_id !== teamId) {
      throw new ApiError("That team is not currently answering.", 409);
    }
    if (!session.current_session_question_id) throw new ApiError("No question is selected.", 400);

    const { data: question, error: qError } = await admin
      .from("session_questions")
      .select("points")
      .eq("id", session.current_session_question_id)
      .maybeSingle();
    if (qError) throw qError;
    if (!question) throw new ApiError("Question not found.", 404);

    const delta = computeAnswerDelta(question.points, outcome, {
      incorrectPenalty: session.settings.incorrectPenalty,
    });

    await applyScoreDelta(admin, {
      sessionId,
      teamId,
      delta,
      reason: outcome,
      sessionQuestionId: session.current_session_question_id,
    });

    await admin
      .from("buzz_events")
      .update({ status: outcome })
      .eq("session_question_id", session.current_session_question_id)
      .eq("team_id", teamId);

    assertTransition(session.status, "scoring");
    const { error } = await admin
      .from("game_sessions")
      .update({ status: "scoring", active_team_id: null })
      .eq("id", sessionId);
    if (error) throw error;

    await logEvent(admin, sessionId, outcome === "correct" ? "answer_correct" : "answer_incorrect", { teamId, delta });
    await playSound(sessionId, outcome);
    const state = await publishState(admin, sessionId);
    return NextResponse.json({ state });
  } catch (error) {
    return handleApiError(error);
  }
}
