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

    if (!canTransition(session.status, "paused")) {
      throw new ApiError("The game cannot be paused right now.", 400);
    }

    const { error } = await admin
      .from("game_sessions")
      .update({ status: "paused", previous_status: session.status })
      .eq("id", sessionId);
    if (error) throw error;

    await logEvent(admin, sessionId, "game_paused", {});
    const state = await publishState(admin, sessionId);
    return NextResponse.json({ state });
  } catch (error) {
    return handleApiError(error);
  }
}
