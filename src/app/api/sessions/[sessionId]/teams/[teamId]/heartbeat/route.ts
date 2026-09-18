import { NextResponse } from "next/server";
import { handleApiError, parseJson } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeam, touchTeamConnection, publishState } from "@/lib/game/session-service";
import { z } from "zod";

const schema = z.object({ token: z.string().min(10), connected: z.boolean().default(true) });

export async function POST(request: Request, ctx: { params: Promise<{ sessionId: string; teamId: string }> }) {
  try {
    const { sessionId, teamId } = await ctx.params;
    const admin = createAdminClient();
    const body = await parseJson(request, schema);
    const team = await requireTeam(admin, sessionId, teamId, body.token);

    await touchTeamConnection(admin, team.id, body.connected);
    const state = await publishState(admin, sessionId);
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    return handleApiError(error);
  }
}
