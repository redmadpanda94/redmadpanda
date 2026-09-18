import { NextResponse } from "next/server";
import { handleApiError, parseJson, requireHost } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSessionForHost, logEvent, publishState, applyScoreDelta } from "@/lib/game/session-service";
import { manualScoreSchema } from "@/lib/validation/schemas";

export async function POST(request: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params;
    const { user } = await requireHost();
    const admin = createAdminClient();
    const session = await requireSessionForHost(admin, sessionId, user.id);
    const { teamId, delta, note } = await parseJson(request, manualScoreSchema);

    await applyScoreDelta(admin, {
      sessionId,
      teamId,
      delta,
      reason: "manual",
      sessionQuestionId: session.current_session_question_id,
      note,
    });

    await logEvent(admin, sessionId, "manual_score", { teamId, delta, note });
    const state = await publishState(admin, sessionId);
    return NextResponse.json({ state });
  } catch (error) {
    return handleApiError(error);
  }
}
