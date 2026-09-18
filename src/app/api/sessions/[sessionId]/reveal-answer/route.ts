import { NextResponse } from "next/server";
import { handleApiError, requireHost } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSessionForHost, logEvent, publishState, playSound } from "@/lib/game/session-service";
import { assertTransition } from "@/lib/game/state-machine";

export async function POST(_request: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params;
    const { user } = await requireHost();
    const admin = createAdminClient();
    const session = await requireSessionForHost(admin, sessionId, user.id);

    assertTransition(session.status, "answer");
    const { error } = await admin
      .from("game_sessions")
      .update({ status: "answer", buzzers_open: false })
      .eq("id", sessionId);
    if (error) throw error;

    await logEvent(admin, sessionId, "answer_revealed", {});
    await playSound(sessionId, "reveal");
    const state = await publishState(admin, sessionId);
    return NextResponse.json({ state });
  } catch (error) {
    return handleApiError(error);
  }
}
