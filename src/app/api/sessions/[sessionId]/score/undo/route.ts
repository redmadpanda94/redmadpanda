import { NextResponse } from "next/server";
import { ApiError, handleApiError, requireHost } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSessionForHost, logEvent, publishState, undoLastScoreEvent } from "@/lib/game/session-service";

export async function POST(_request: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params;
    const { user } = await requireHost();
    const admin = createAdminClient();
    await requireSessionForHost(admin, sessionId, user.id);

    const undone = await undoLastScoreEvent(admin, sessionId);
    if (!undone) throw new ApiError("Nothing to undo.", 400);

    await logEvent(admin, sessionId, "score_undone", { scoreEventId: undone.id, teamId: undone.team_id, delta: undone.delta });
    const state = await publishState(admin, sessionId);
    return NextResponse.json({ state });
  } catch (error) {
    return handleApiError(error);
  }
}
