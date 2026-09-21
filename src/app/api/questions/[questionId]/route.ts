import { NextResponse } from "next/server";
import { ApiError, handleApiError, parseJson, requireHost } from "@/lib/api-helpers";
import { questionUpdateSchema } from "@/lib/validation/schemas";
import { computeQuestionPositions } from "@/lib/game/question-order";

export async function PATCH(request: Request, ctx: { params: Promise<{ questionId: string }> }) {
  try {
    const { questionId } = await ctx.params;
    const { supabase } = await requireHost();
    const body = await parseJson(request, questionUpdateSchema);

    const update: Record<string, unknown> = {};
    if (body.points !== undefined) update.points = body.points;
    if (body.questionText !== undefined) update.question_text = body.questionText;
    if (body.answerText !== undefined) update.answer_text = body.answerText;
    if (body.notes !== undefined) update.notes = body.notes;
    if (body.mediaPlacement !== undefined) update.media_placement = body.mediaPlacement;
    if (body.isFinal !== undefined) update.is_final = body.isFinal;
    if (body.status !== undefined) update.status = body.status;
    if (body.position !== undefined) update.position = body.position;

    const { data, error } = await supabase.from("questions").update(update).eq("id", questionId).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new ApiError("Question not found.", 404);

    if (body.points !== undefined) {
      const { data: siblings, error: siblingsError } = await supabase
        .from("questions")
        .select("id, points, position")
        .eq("category_id", data.category_id);
      if (siblingsError) throw siblingsError;
      const positionUpdates = computeQuestionPositions(siblings ?? []);
      for (const posUpdate of positionUpdates) {
        const { error: updateError } = await supabase.from("questions").update({ position: posUpdate.position }).eq("id", posUpdate.id);
        if (updateError) throw updateError;
        if (posUpdate.id === data.id) data.position = posUpdate.position;
      }
    }

    return NextResponse.json({ question: data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ questionId: string }> }) {
  try {
    const { questionId } = await ctx.params;
    const { supabase } = await requireHost();
    const { data, error } = await supabase.from("questions").delete().eq("id", questionId).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new ApiError("Question not found.", 404);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
