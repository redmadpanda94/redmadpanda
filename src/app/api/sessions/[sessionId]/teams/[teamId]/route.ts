import { NextResponse } from "next/server";
import { ApiError, handleApiError, parseJson, requireHost } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSessionForHost, publishState } from "@/lib/game/session-service";
import { teamRenameSchema } from "@/lib/validation/schemas";

export async function PATCH(request: Request, ctx: { params: Promise<{ sessionId: string; teamId: string }> }) {
  try {
    const { sessionId, teamId } = await ctx.params;
    const { user } = await requireHost();
    const admin = createAdminClient();
    await requireSessionForHost(admin, sessionId, user.id);
    const body = await parseJson(request, teamRenameSchema);

    const { data, error } = await admin
      .from("teams")
      .update({ name: body.name })
      .eq("id", teamId)
      .eq("session_id", sessionId)
      .select()
      .maybeSingle();
    if (error) {
      if (error.code === "23505") throw new ApiError("That team name is already taken.", 409);
      throw error;
    }
    if (!data) throw new ApiError("Team not found.", 404);

    const state = await publishState(admin, sessionId);
    return NextResponse.json({ state });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ sessionId: string; teamId: string }> }) {
  try {
    const { sessionId, teamId } = await ctx.params;
    const { user } = await requireHost();
    const admin = createAdminClient();
    await requireSessionForHost(admin, sessionId, user.id);

    const { error } = await admin.from("teams").delete().eq("id", teamId).eq("session_id", sessionId);
    if (error) throw error;

    const state = await publishState(admin, sessionId);
    return NextResponse.json({ state });
  } catch (error) {
    return handleApiError(error);
  }
}
