import { NextResponse } from "next/server";
import { ApiError, handleApiError, parseJson, requireHost } from "@/lib/api-helpers";
import { categoryCreateSchema } from "@/lib/validation/schemas";

export async function POST(request: Request, ctx: { params: Promise<{ gameId: string }> }) {
  try {
    const { gameId } = await ctx.params;
    const { supabase, user } = await requireHost();
    const body = await parseJson(request, categoryCreateSchema);

    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("id, owner_id")
      .eq("id", gameId)
      .maybeSingle();
    if (gameError) throw gameError;
    if (!game || game.owner_id !== user.id) throw new ApiError("Game not found.", 404);

    const { count } = await supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .eq("game_id", gameId);

    const { data, error } = await supabase
      .from("categories")
      .insert({ game_id: gameId, name: body.name, description: body.description ?? null, position: count ?? 0 })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ category: data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
