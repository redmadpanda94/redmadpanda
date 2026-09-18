import { NextResponse } from "next/server";
import { ApiError, handleApiError, parseJson, requireHost } from "@/lib/api-helpers";
import { questionUpdateSchema } from "@/lib/validation/schemas";

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
