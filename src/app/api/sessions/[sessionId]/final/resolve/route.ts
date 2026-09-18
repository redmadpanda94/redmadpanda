import { NextResponse } from "next/server";
import { ApiError, handleApiError, parseJson, requireHost } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSessionForHost, logEvent, publishState, applyScoreDelta } from "@/lib/game/session-service";
import { computeFinalWagerDelta } from "@/lib/game/scoring";
import { finalOutcomeSchema } from "@/lib/validation/schemas";

export async function POST(request: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params;
    const { user } = await requireHost();
    const admin = createAdminClient();
    const session = await requireSessionForHost(admin, sessionId, user.id);
    const { teamId, correct } = await parseJson(request, finalOutcomeSchema);

    if (!session.current_session_question_id) throw new ApiError("No Final Question is selected.", 400);

    const { data: wager } = await admin
      .from("final_wagers")
      .select("*")
      .eq("session_question_id", session.current_session_question_id)
      .eq("team_id", teamId)
      .maybeSingle();

    const amount = wager?.amount ?? 0;
    const delta = computeFinalWagerDelta(amount, correct);

    await applyScoreDelta(admin, {
      sessionId,
      teamId,
      delta,
      reason: "final_question",
      sessionQuestionId: session.current_session_question_id,
      note: `Final Question wager: ${amount}`,
    });

    if (wager) {
      await admin.from("final_wagers").update({ correct }).eq("id", wager.id);
    }

    await logEvent(admin, sessionId, "final_resolved", { teamId, correct, amount });
    const state = await publishState(admin, sessionId);
    return NextResponse.json({ state });
  } catch (error) {
    return handleApiError(error);
  }
}
