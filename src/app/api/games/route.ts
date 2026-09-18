import { NextResponse } from "next/server";
import { handleApiError, parseJson, requireHost } from "@/lib/api-helpers";
import { gameCreateSchema } from "@/lib/validation/schemas";
import { DEFAULT_GAME_SETTINGS } from "@/types/database";

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireHost();
    const body = await parseJson(request, gameCreateSchema);

    const { data, error } = await supabase
      .from("games")
      .insert({
        owner_id: user.id,
        title: body.title,
        description: body.description ?? null,
        game_type: body.gameType,
        settings: DEFAULT_GAME_SETTINGS,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ game: data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
