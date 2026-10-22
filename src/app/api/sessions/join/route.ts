import { NextResponse } from "next/server";
import { ApiError, handleApiError, parseJson } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeJoinCode } from "@/lib/game/codes";
import { generateTeamToken, hashTeamToken } from "@/lib/team-auth";
import { logEvent, publishState } from "@/lib/game/session-service";
import { z } from "zod";
import { teamJoinSchema } from "@/lib/validation/schemas";

const bodySchema = teamJoinSchema.extend({ joinCode: z.string().min(4).max(12) });

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, bodySchema);
    const admin = createAdminClient();
    const code = normalizeJoinCode(body.joinCode);

    const { data: session, error } = await admin
      .from("game_sessions")
      .select("id, status, title")
      .eq("join_code", code)
      .maybeSingle();
    if (error) throw error;
    if (!session) throw new ApiError("We couldn't find a game with that code. Double-check and try again.", 404);
    if (session.status === "finished") throw new ApiError("This game has already finished.", 400);

    const token = generateTeamToken();
    const secretHash = hashTeamToken(token);

    // A team name already taken in this session is usually a typo/collision
    // -- unless it belongs to a currently-disconnected team, in which case
    // this is very likely that same team rejoining mid-game from a new
    // device after losing its saved session (lost cache, new phone, etc.).
    // Reconnecting keeps their existing id and score instead of starting a
    // duplicate team at 0. Matched in JS (not ilike) so `%`/`_` in a team
    // name can't be misread as SQL wildcards; the real uniqueness
    // constraint is teams_session_name_unique on lower(name), same rule.
    const { data: sessionTeams } = await admin
      .from("teams")
      .select("id, name, connected, last_seen_at")
      .eq("session_id", session.id);
    const existing = (sessionTeams ?? []).find((t) => t.name.toLowerCase() === body.name.toLowerCase());

    if (existing) {
      const stillConnected = existing.connected && Date.now() - new Date(existing.last_seen_at).getTime() < 45_000;
      if (stillConnected) {
        throw new ApiError("That team name is already taken in this game. Please choose another.", 409);
      }

      const { error: updateError } = await admin
        .from("teams")
        .update({ secret_hash: secretHash, connected: true, last_seen_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (updateError) throw updateError;

      await logEvent(admin, session.id, "team_rejoined", { teamId: existing.id, teamName: existing.name });
      await publishState(admin, session.id);

      return NextResponse.json({
        sessionId: session.id,
        sessionTitle: session.title,
        teamId: existing.id,
        teamName: existing.name,
        token,
      });
    }

    const { data: team, error: teamError } = await admin
      .from("teams")
      .insert({ session_id: session.id, name: body.name, secret_hash: secretHash, connected: true })
      .select()
      .single();

    if (teamError) {
      if (teamError.code === "23505") {
        throw new ApiError("That team name is already taken in this game. Please choose another.", 409);
      }
      throw teamError;
    }

    await logEvent(admin, session.id, "team_joined", { teamId: team.id, teamName: team.name });
    await publishState(admin, session.id);

    return NextResponse.json({
      sessionId: session.id,
      sessionTitle: session.title,
      teamId: team.id,
      teamName: team.name,
      token,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
