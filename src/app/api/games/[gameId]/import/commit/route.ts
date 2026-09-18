import { NextResponse } from "next/server";
import { ApiError, handleApiError, parseJson, requireHost } from "@/lib/api-helpers";
import { importCommitSchema } from "@/lib/validation/schemas";
import type { CategoryRow } from "@/types/database";

export async function POST(request: Request, ctx: { params: Promise<{ gameId: string }> }) {
  try {
    const { gameId } = await ctx.params;
    const { supabase, user } = await requireHost();
    const { rows } = await parseJson(request, importCommitSchema);

    const { data: game } = await supabase.from("games").select("id, owner_id").eq("id", gameId).maybeSingle();
    if (!game || game.owner_id !== user.id) throw new ApiError("Game not found.", 404);

    const { data: existingCategories } = await supabase.from("categories").select("*").eq("game_id", gameId);
    const categoryByName = new Map(((existingCategories ?? []) as CategoryRow[]).map((c) => [c.name.toLowerCase(), c]));
    let nextCategoryPosition = existingCategories?.length ?? 0;

    const createdCategories = new Map<string, { id: string; name: string; position: number; questions: unknown[] }>();

    for (const row of rows) {
      const key = row.category.toLowerCase();
      let category = categoryByName.get(key);
      if (!category) {
        const { data: newCategory, error } = await supabase
          .from("categories")
          .insert({ game_id: gameId, name: row.category, position: nextCategoryPosition++ })
          .select()
          .single();
        if (error) throw error;
        category = newCategory as CategoryRow;
        categoryByName.set(key, category);
      }

      const { count } = await supabase
        .from("questions")
        .select("id", { count: "exact", head: true })
        .eq("category_id", category.id);

      const { data: question, error: qError } = await supabase
        .from("questions")
        .insert({
          category_id: category.id,
          points: row.points,
          question_text: row.question,
          answer_text: row.answer,
          notes: row.notes ?? null,
          media_placement: row.mediaPlacement,
          position: count ?? 0,
        })
        .select()
        .single();
      if (qError) throw qError;

      let media: unknown[] = [];
      if (row.mediaUrl && row.mediaType) {
        const youtubeMatch = row.mediaType === "youtube" ? extractYoutubeId(row.mediaUrl) : null;
        const { data: mediaRow, error: mError } = await supabase
          .from("media")
          .insert({
            question_id: question.id,
            type: row.mediaType,
            url: row.mediaUrl,
            youtube_id: youtubeMatch,
            position: 0,
          })
          .select()
          .single();
        if (mError) throw mError;
        media = [mediaRow];
      }

      const entry = createdCategories.get(category.id) ?? { id: category.id, name: category.name, position: category.position, questions: [] };
      entry.questions.push({ ...question, media });
      createdCategories.set(category.id, entry);
    }

    return NextResponse.json({ categories: [...createdCategories.values()] });
  } catch (error) {
    return handleApiError(error);
  }
}

function extractYoutubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
    return null;
  } catch {
    return null;
  }
}
