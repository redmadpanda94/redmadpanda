import { NextResponse } from "next/server";
import { handleApiError, requireHost } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSessionForHost, logEvent, publishState } from "@/lib/game/session-service";

export async function POST(_request: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params;
    const { user } = await requireHost();
    const admin = createAdminClient();
    const session = await requireSessionForHost(admin, sessionId, user.id);

    if (session.current_session_question_id) {
      await admin.from("buzz_events").delete().eq("session_question_id", session.current_session_question_id);
    }
    await admin.from("game_sessions").update({ active_team_id: null }).eq("id", sessionId);

    await logEvent(admin, sessionId, "buzz_queue_cleared", {});
    const state = await publishState(admin, sessionId);
    return NextResponse.json({ state });
  } catch (error) {
    return handleApiError(error);
  }
}
