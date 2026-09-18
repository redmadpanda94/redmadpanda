import { NextResponse } from "next/server";
import { handleApiError, parseJson, requireHost } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSessionForHost, publishState } from "@/lib/game/session-service";
import { timerSchema } from "@/lib/validation/schemas";

export async function POST(request: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params;
    const { user } = await requireHost();
    const admin = createAdminClient();
    await requireSessionForHost(admin, sessionId, user.id);
    const { seconds } = await parseJson(request, timerSchema);

    const { error } = await admin
      .from("game_sessions")
      .update({
        timer_seconds: seconds,
        timer_started_at: seconds !== null ? new Date().toISOString() : null,
      })
      .eq("id", sessionId);
    if (error) throw error;

    const state = await publishState(admin, sessionId);
    return NextResponse.json({ state });
  } catch (error) {
    return handleApiError(error);
  }
}
