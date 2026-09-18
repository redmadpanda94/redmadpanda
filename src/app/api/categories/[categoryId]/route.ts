import { NextResponse } from "next/server";
import { ApiError, handleApiError, parseJson, requireHost } from "@/lib/api-helpers";
import { categoryUpdateSchema } from "@/lib/validation/schemas";

export async function PATCH(request: Request, ctx: { params: Promise<{ categoryId: string }> }) {
  try {
    const { categoryId } = await ctx.params;
    const { supabase } = await requireHost();
    const body = await parseJson(request, categoryUpdateSchema);

    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update.name = body.name;
    if (body.description !== undefined) update.description = body.description;
    if (body.position !== undefined) update.position = body.position;

    // RLS scopes this update to categories the signed-in host owns; a row
    // that doesn't exist or belongs to someone else simply won't match.
    const { data, error } = await supabase.from("categories").update(update).eq("id", categoryId).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new ApiError("Category not found.", 404);
    return NextResponse.json({ category: data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ categoryId: string }> }) {
  try {
    const { categoryId } = await ctx.params;
    const { supabase } = await requireHost();
    const { data, error } = await supabase.from("categories").delete().eq("id", categoryId).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new ApiError("Category not found.", 404);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
