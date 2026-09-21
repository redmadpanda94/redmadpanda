import { NextResponse } from "next/server";
import { ApiError, handleApiError, parseJson, requireHost } from "@/lib/api-helpers";
import { questionCreateSchema } from "@/lib/validation/schemas";
import { computeQuestionPositions } from "@/lib/game/question-order";
import type { SupabaseClient } from "@supabase/supabase-js";

async function reorderByPoints(supabase: SupabaseClient, categoryId: string) {
  const { data, error } = await supabase.from("questions").select("id, points, position").eq("category_id", categoryId);
  if (error) throw error;
  const updates = computeQuestionPositions(data ?? []);
  for (const update of updates) {
    const { error: updateError } = await supabase.from("questions").update({ position: update.position }).eq("id", update.id);
    if (updateError) throw updateError;
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ categoryId: string }> }) {
  try {
    const { categoryId } = await ctx.params;
    const { supabase } = await requireHost();
    const body = await parseJson(request, questionCreateSchema);

    const { data: category, error: catError } = await supabase
      .from("categories")
      .select("id")
      .eq("id", categoryId)
      .maybeSingle();
    if (catError) throw catError;
    if (!category) throw new ApiError("Category not found.", 404);

    const { count } = await supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("category_id", categoryId);

    const { data, error } = await supabase
      .from("questions")
      .insert({
        category_id: categoryId,
        points: body.points,
        question_text: body.questionText,
        answer_text: body.answerText,
        notes: body.notes ?? null,
        media_placement: body.mediaPlacement,
        is_final: body.isFinal,
        position: count ?? 0,
      })
      .select()
      .single();
    if (error) throw error;

    await reorderByPoints(supabase, categoryId);
    const { data: reordered, error: refetchError } = await supabase
      .from("questions")
      .select("*")
      .eq("id", data.id)
      .single();
    if (refetchError) throw refetchError;

    return NextResponse.json({ question: reordered }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
