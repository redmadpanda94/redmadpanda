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
