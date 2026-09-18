import { NextResponse } from "next/server";
import { ApiError, handleApiError, parseJson } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeam, getSessionOrThrow, logEvent, publishState } from "@/lib/game/session-service";
import { clampFinalWager } from "@/lib/game/scoring";
import { finalWagerSchema } from "@/lib/validation/schemas";

export async function POST(request: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params;
    const admin = createAdminClient();
    const body = await parseJson(request, finalWagerSchema);
    const team = await requireTeam(admin, sessionId, body.teamId, body.token);

    const session = await getSessionOrThrow(admin, sessionId);
    if (session.status !== "final_question" || !session.current_session_question_id) {
      throw new ApiError("Final Question wagers aren't open right now.", 409);
    }

    const amount = clampFinalWager(body.amount, team.score);

    const { error } = await admin.from("final_wagers").upsert(
      {
        session_id: sessionId,
        session_question_id: session.current_session_question_id,
        team_id: team.id,
        amount,
      },
      { onConflict: "session_question_id,team_id" }
    );
    if (error) throw error;

    await logEvent(admin, sessionId, "final_wager_submitted", { teamId: team.id });
    await publishState(admin, sessionId);
    return NextResponse.json({ ok: true, amount });
  } catch (error) {
    return handleApiError(error);
  }
}
