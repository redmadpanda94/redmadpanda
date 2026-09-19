import { NextResponse } from "next/server";
import { ApiError, handleApiError, requireHost } from "@/lib/api-helpers";
import type { CategoryRow, GameRow, MediaRow, QuestionRow } from "@/types/database";

export async function POST(_request: Request, ctx: { params: Promise<{ gameId: string }> }) {
  try {
    const { gameId } = await ctx.params;
    const { supabase, user } = await requireHost();

    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("*")
      .eq("id", gameId)
      .maybeSingle();
    if (gameError) throw gameError;
    if (!game || (game as GameRow).owner_id !== user.id) throw new ApiError("Game not found.", 404);

    const { data: categories, error: catError } = await supabase
      .from("categories")
      .select("*")
      .eq("game_id", gameId)
      .order("position");
    if (catError) throw catError;

    const categoryIds = (categories ?? []).map((c: CategoryRow) => c.id);
    const { data: questions, error: qError } =
      categoryIds.length > 0
        ? await supabase.from("questions").select("*").in("category_id", categoryIds).order("position")
        : { data: [] as QuestionRow[], error: null };
    if (qError) throw qError;

    const questionIds = (questions ?? []).map((q: QuestionRow) => q.id);
    const { data: media, error: mError } =
      questionIds.length > 0
        ? await supabase.from("media").select("*").in("question_id", questionIds).order("position")
        : { data: [] as MediaRow[], error: null };
    if (mError) throw mError;

    const { data: newGame, error: newGameError } = await supabase
      .from("games")
      .insert({
        owner_id: user.id,
        title: `${(game as GameRow).title} (Copy)`,
        description: (game as GameRow).description,
        game_type: (game as GameRow).game_type,
        settings: (game as GameRow).settings,
      })
      .select()
      .single();
    if (newGameError) throw newGameError;

    const categoryIdMap = new Map<string, string>();
    for (const category of (categories ?? []) as CategoryRow[]) {
      const { data: newCategory, error } = await supabase
        .from("categories")
        .insert({
          game_id: newGame.id,
          name: category.name,
          description: category.description,
          position: category.position,
        })
        .select()
        .single();
      if (error) throw error;
      categoryIdMap.set(category.id, newCategory.id);
    }

    const questionIdMap = new Map<string, string>();
    for (const question of (questions ?? []) as QuestionRow[]) {
      const newCategoryId = categoryIdMap.get(question.category_id);
      if (!newCategoryId) continue;
      const { data: newQuestion, error } = await supabase
        .from("questions")
        .insert({
          category_id: newCategoryId,
          points: question.points,
          question_text: question.question_text,
          answer_text: question.answer_text,
          notes: question.notes,
          media_placement: question.media_placement,
          status: "available",
          position: question.position,
          is_final: question.is_final,
        })
        .select()
        .single();
      if (error) throw error;
      questionIdMap.set(question.id, newQuestion.id);
    }

    for (const item of (media ?? []) as MediaRow[]) {
      const newQuestionId = questionIdMap.get(item.question_id);
      if (!newQuestionId) continue;
      const { error } = await supabase.from("media").insert({
        question_id: newQuestionId,
        type: item.type,
        url: item.url,
        storage_path: item.storage_path,
        original_storage_path: item.original_storage_path,
        youtube_id: item.youtube_id,
        youtube_start: item.youtube_start,
        youtube_end: item.youtube_end,
        youtube_audio_only: item.youtube_audio_only,
        trim_start: item.trim_start,
        trim_end: item.trim_end,
        duration: item.duration,
        position: item.position,
      });
      if (error) throw error;
    }

    return NextResponse.json({ game: newGame }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
