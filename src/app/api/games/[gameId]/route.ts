import { NextResponse } from "next/server";
import { ApiError, handleApiError, parseJson, requireHost } from "@/lib/api-helpers";
import { gameUpdateSchema } from "@/lib/validation/schemas";

async function loadOwnedGame(
  supabase: Awaited<ReturnType<typeof requireHost>>["supabase"],
  userId: string,
  gameId: string
) {
  const { data, error } = await supabase.from("games").select("*").eq("id", gameId).maybeSingle();
  if (error) throw new ApiError("Failed to load game.", 500);
  if (!data || data.owner_id !== userId) throw new ApiError("Game not found.", 404);
  return data;
}

export async function PATCH(request: Request, ctx: { params: Promise<{ gameId: string }> }) {
  try {
    const { gameId } = await ctx.params;
    const { supabase, user } = await requireHost();
    const existing = await loadOwnedGame(supabase, user.id, gameId);
    const body = await parseJson(request, gameUpdateSchema);

    const update: Record<string, unknown> = {};
    if (body.title !== undefined) update.title = body.title;
    if (body.description !== undefined) update.description = body.description;
    if (body.settings !== undefined) update.settings = { ...existing.settings, ...body.settings };

    const { data, error } = await supabase.from("games").update(update).eq("id", gameId).select().single();
    if (error) throw error;
    return NextResponse.json({ game: data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ gameId: string }> }) {
  try {
    const { gameId } = await ctx.params;
    const { supabase, user } = await requireHost();
    await loadOwnedGame(supabase, user.id, gameId);
    const { error } = await supabase.from("games").delete().eq("id", gameId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
