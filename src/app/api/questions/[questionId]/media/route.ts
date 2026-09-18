import { NextResponse } from "next/server";
import { ApiError, handleApiError, parseJson, requireHost } from "@/lib/api-helpers";
import { mediaCreateSchema } from "@/lib/validation/schemas";

export async function POST(request: Request, ctx: { params: Promise<{ questionId: string }> }) {
  try {
    const { questionId } = await ctx.params;
    const { supabase } = await requireHost();
    const body = await parseJson(request, mediaCreateSchema);

    const { data: question, error: qError } = await supabase
      .from("questions")
      .select("id")
      .eq("id", questionId)
      .maybeSingle();
    if (qError) throw qError;
    if (!question) throw new ApiError("Question not found.", 404);

    const { count } = await supabase
      .from("media")
      .select("id", { count: "exact", head: true })
      .eq("question_id", questionId);

    const { data, error } = await supabase
      .from("media")
      .insert({
        question_id: questionId,
        type: body.type,
        url: body.url ?? null,
        storage_path: body.storagePath ?? null,
        original_storage_path: body.originalStoragePath ?? null,
        youtube_id: body.youtubeId ?? null,
        youtube_start: body.youtubeStart ?? null,
        trim_start: body.trimStart ?? null,
        trim_end: body.trimEnd ?? null,
        duration: body.duration ?? null,
        position: count ?? 0,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ media: data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
