import { NextResponse } from "next/server";
import { ApiError, handleApiError, requireHost } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSessionForHost, logEvent, publishState } from "@/lib/game/session-service";
import { canTransition } from "@/lib/game/state-machine";

export async function POST(_request: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params;
    const { user } = await requireHost();
    const admin = createAdminClient();
    const session = await requireSessionForHost(admin, sessionId, user.id);

    if (!canTransition(session.status, "board")) {
      throw new ApiError(`Cannot start the game from its current state (${session.status}).`, 400);
    }

    const { count: teamCount } = await admin
      .from("teams")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId);
    if (!teamCount) throw new ApiError("At least one team needs to join before you can start.", 400);

    const { error } = await admin
      .from("game_sessions")
      .update({ status: "board", started_at: new Date().toISOString() })
      .eq("id", sessionId);
    if (error) throw error;

    await logEvent(admin, sessionId, "game_started", {});
    const state = await publishState(admin, sessionId);
    return NextResponse.json({ state });
  } catch (error) {
    return handleApiError(error);
  }
}
