import { NextResponse } from "next/server";
import { ApiError, handleApiError, parseJson, requireHost } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSessionForHost, logEvent, publishState, playSound } from "@/lib/game/session-service";
import { assertTransition } from "@/lib/game/state-machine";
import { z } from "zod";

const schema = z.object({ open: z.boolean() });

export async function PATCH(request: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params;
    const { user } = await requireHost();
    const admin = createAdminClient();
    const session = await requireSessionForHost(admin, sessionId, user.id);
    const { open } = await parseJson(request, schema);

    if (!session.current_session_question_id) {
      throw new ApiError("Select a question before enabling buzzers.", 400);
    }

    if (open) {
      assertTransition(session.status, "buzzing");
      const { error } = await admin
        .from("game_sessions")
        .update({ status: "buzzing", buzzers_open: true, buzzers_opened_at: new Date().toISOString() })
        .eq("id", sessionId);
      if (error) throw error;
      await logEvent(admin, sessionId, "buzzers_enabled", {});
      await playSound(sessionId, "buzzer_enabled");
    } else {
      const { error } = await admin.from("game_sessions").update({ buzzers_open: false }).eq("id", sessionId);
      if (error) throw error;
      await logEvent(admin, sessionId, "buzzers_disabled", {});
    }

    const state = await publishState(admin, sessionId);
    return NextResponse.json({ state });
  } catch (error) {
    return handleApiError(error);
  }
}
