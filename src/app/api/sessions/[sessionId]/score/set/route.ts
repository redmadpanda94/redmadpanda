import { NextResponse } from "next/server";
import { ApiError, handleApiError, parseJson, requireHost } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSessionForHost, logEvent, publishState, applyScoreDelta } from "@/lib/game/session-service";
import { setScoreSchema } from "@/lib/validation/schemas";

export async function POST(request: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params;
    const { user } = await requireHost();
    const admin = createAdminClient();
    await requireSessionForHost(admin, sessionId, user.id);
    const { teamId, score } = await parseJson(request, setScoreSchema);

    const { data: team, error } = await admin.from("teams").select("score").eq("id", teamId).maybeSingle();
    if (error) throw error;
    if (!team) throw new ApiError("Team not found.", 404);

    await applyScoreDelta(admin, {
      sessionId,
      teamId,
      delta: score - team.score,
      reason: "reset",
      note: "Score set manually",
    });

    await logEvent(admin, sessionId, "score_set", { teamId, score });
    const state = await publishState(admin, sessionId);
    return NextResponse.json({ state });
  } catch (error) {
    return handleApiError(error);
  }
}
