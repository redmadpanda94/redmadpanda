import { NextResponse } from "next/server";
import { ApiError, handleApiError, requireHost } from "@/lib/api-helpers";
import { generateJoinCode } from "@/lib/game/codes";
import { DEFAULT_GAME_SETTINGS } from "@/types/database";
import type { CategoryRow, GameRow, MediaRow, QuestionRow } from "@/types/database";

/**
 * Creates a live GameSession by snapshotting the current game template
 * (spec sections 33 & 60). Later edits to the template never affect an
 * in-progress or past session.
 */
export async function POST(request: Request, ctx: { params: Promise<{ gameId: string }> }) {
  try {
    const { gameId } = await ctx.params;
    const { supabase, user } = await requireHost();
    const body = await request.json().catch(() => ({}));

    const { data: game, error: gameError } = await supabase.from("games").select("*").eq("id", gameId).maybeSingle();
    if (gameError) throw gameError;
    if (!game || (game as GameRow).owner_id !== user.id) throw new ApiError("Game not found.", 404);

    const { data: categories, error: catError } = await supabase
      .from("categories")
      .select("*")
      .eq("game_id", gameId)
      .order("position");
    if (catError) throw catError;
    if (!categories || categories.length === 0) {
      throw new ApiError("Add at least one category with questions before starting a session.", 400);
    }

    const categoryIds = categories.map((c: CategoryRow) => c.id);
    const { data: questions, error: qError } = await supabase
      .from("questions")
      .select("*")
      .in("category_id", categoryIds)
      .order("position");
    if (qError) throw qError;
    if (!questions || questions.length === 0) {
      throw new ApiError("Add at least one question before starting a session.", 400);
    }

    const questionIds = questions.map((q: QuestionRow) => q.id);
    const { data: media, error: mError } =
      questionIds.length > 0
        ? await supabase.from("media").select("*").in("question_id", questionIds)
        : { data: [] as MediaRow[], error: null };
    if (mError) throw mError;

    let joinCode = generateJoinCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: existing } = await supabase.from("game_sessions").select("id").eq("join_code", joinCode).maybeSingle();
      if (!existing) break;
      joinCode = generateJoinCode();
    }

    const { data: session, error: sessionError } = await supabase
      .from("game_sessions")
      .insert({
        game_id: gameId,
        host_id: user.id,
        title: typeof body?.title === "string" && body.title.trim() ? body.title.trim() : (game as GameRow).title,
        join_code: joinCode,
        status: "lobby",
        settings: { ...DEFAULT_GAME_SETTINGS, ...(game as GameRow).settings },
      })
      .select()
      .single();
    if (sessionError) throw sessionError;

    const categoryIdMap = new Map<string, string>();
    for (const category of categories as CategoryRow[]) {
      const { data: sc, error } = await supabase
        .from("session_categories")
        .insert({
          session_id: session.id,
          source_category_id: category.id,
          name: category.name,
          position: category.position,
        })
        .select()
        .single();
      if (error) throw error;
      categoryIdMap.set(category.id, sc.id);
    }

    const questionIdMap = new Map<string, string>();
    for (const question of questions as QuestionRow[]) {
      const sessionCategoryId = categoryIdMap.get(question.category_id);
      if (!sessionCategoryId) continue;
      const { data: sq, error } = await supabase
        .from("session_questions")
        .insert({
          session_id: session.id,
          session_category_id: sessionCategoryId,
          source_question_id: question.id,
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
      questionIdMap.set(question.id, sq.id);
    }

    for (const item of (media ?? []) as MediaRow[]) {
      const sessionQuestionId = questionIdMap.get(item.question_id);
      if (!sessionQuestionId) continue;
      const { error } = await supabase.from("session_media").insert({
        session_question_id: sessionQuestionId,
        type: item.type,
        url: item.url,
        storage_path: item.storage_path,
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

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
