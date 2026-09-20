import Papa from "papaparse";
import { ApiError, handleApiError, requireHost } from "@/lib/api-helpers";
import type { CategoryRow, GameRow, MediaRow, QuestionRow } from "@/types/database";

/**
 * Exports a game as CSV -- plain text, opens directly in Google Sheets
 * (File > Import > Upload) or Excel, and uses the same column headers as
 * the importer so a round trip (export, edit in a spreadsheet, re-import)
 * works. Only host-owned games (RLS-scoped query) can be exported.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ gameId: string }> }) {
  try {
    const { gameId } = await ctx.params;
    const { supabase } = await requireHost();

    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("*")
      .eq("id", gameId)
      .maybeSingle();
    if (gameError) throw gameError;
    if (!game) throw new ApiError("Game not found.", 404);

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

    const categoryNameById = new Map(((categories ?? []) as CategoryRow[]).map((c) => [c.id, c.name]));
    const firstMediaByQuestion = new Map<string, MediaRow>();
    for (const m of (media ?? []) as MediaRow[]) {
      if (!firstMediaByQuestion.has(m.question_id)) firstMediaByQuestion.set(m.question_id, m);
    }

    const rows = ((questions ?? []) as QuestionRow[]).map((q) => {
      const firstMedia = firstMediaByQuestion.get(q.id);
      return {
        Category: categoryNameById.get(q.category_id) ?? "",
        Points: q.points,
        Question: q.question_text,
        Answer: q.answer_text,
        MediaURL: firstMedia?.url ?? "",
        MediaType: firstMedia?.type ?? "",
        MediaPlacement: q.media_placement,
        Notes: q.notes ?? "",
      };
    });

    const csv = Papa.unparse(rows);
    const filename = `${(game as GameRow).title.replace(/[^a-z0-9-_]+/gi, "-")}.csv`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
