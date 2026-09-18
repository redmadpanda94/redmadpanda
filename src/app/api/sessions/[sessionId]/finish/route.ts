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

    assertTransition(session.status, "finished");
    const { error } = await admin
      .from("game_sessions")
      .update({ status: "finished", finished_at: new Date().toISOString() })
      .eq("id", sessionId);
    if (error) throw error;

    await logEvent(admin, sessionId, "game_finished", {});
    const state = await publishState(admin, sessionId);
    return NextResponse.json({ state });
  } catch (error) {
    return handleApiError(error);
  }
}
