import { NextResponse } from "next/server";
import { ApiError, handleApiError, parseJson } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeam, getSessionOrThrow, logEvent, publishState, playSound } from "@/lib/game/session-service";
import { buzzSchema } from "@/lib/validation/schemas";

/**
 * Server-authoritative buzz. Ordering comes from the database bigserial
 * `sequence` column, never from client timestamps (spec sections 17-18,
 * 55). The unique index on (session_question_id, team_id) makes duplicate
 * buzzes from the same team a no-op even under a race -- Postgres resolves
 * concurrent inserts atomically, so there can never be two "firsts".
 */
export async function POST(request: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params;
    const admin = createAdminClient();
    const body = await parseJson(request, buzzSchema);
    const team = await requireTeam(admin, sessionId, body.teamId, body.token);

    const session = await getSessionOrThrow(admin, sessionId);
    if (!session.buzzers_open || session.status !== "buzzing" || !session.current_session_question_id) {
      throw new ApiError("Buzzers are currently disabled.", 409);
    }

    const { data: inserted, error } = await admin
      .from("buzz_events")
      .insert({
        session_id: sessionId,
        session_question_id: session.current_session_question_id,
        team_id: team.id,
        client_latency_ms: body.clientLatencyMs ?? null,
      })
      .select()
      .maybeSingle();

    if (error) {
      // Unique violation -- this team already buzzed for this question.
      if (error.code === "23505") {
        return NextResponse.json({ ok: true, alreadyBuzzed: true });
      }
      throw error;
    }

    // First buzz for this question gets the celebratory sound cue.
    const { count } = await admin
      .from("buzz_events")
      .select("id", { count: "exact", head: true })
      .eq("session_question_id", session.current_session_question_id);
    if (count === 1) await playSound(sessionId, "first_buzz");

    await logEvent(admin, sessionId, "team_buzzed", { teamId: team.id, teamName: team.name, sequence: inserted?.sequence });
    const state = await publishState(admin, sessionId);
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    return handleApiError(error);
  }
}
