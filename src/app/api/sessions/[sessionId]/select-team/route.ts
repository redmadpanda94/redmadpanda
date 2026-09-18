import { NextResponse } from "next/server";
import { ApiError, handleApiError, parseJson, requireHost } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSessionForHost, logEvent, publishState } from "@/lib/game/session-service";
import { assertTransition } from "@/lib/game/state-machine";
import { selectTeamSchema } from "@/lib/validation/schemas";

export async function POST(request: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params;
    const { user } = await requireHost();
    const admin = createAdminClient();
    const session = await requireSessionForHost(admin, sessionId, user.id);
    const { teamId } = await parseJson(request, selectTeamSchema);

    if (teamId) {
      const { data: team } = await admin.from("teams").select("id").eq("id", teamId).eq("session_id", sessionId).maybeSingle();
      if (!team) throw new ApiError("This team is no longer connected.", 404);

      assertTransition(session.status, "answering");
      const { error } = await admin
        .from("game_sessions")
        .update({ status: "answering", active_team_id: teamId })
        .eq("id", sessionId);
      if (error) throw error;
      await logEvent(admin, sessionId, "team_selected", { teamId });
    } else {
      assertTransition(session.status, "buzzing");
      const { error } = await admin
        .from("game_sessions")
        .update({ status: "buzzing", active_team_id: null })
        .eq("id", sessionId);
      if (error) throw error;
    }

    const state = await publishState(admin, sessionId);
    return NextResponse.json({ state });
  } catch (error) {
    return handleApiError(error);
  }
}
