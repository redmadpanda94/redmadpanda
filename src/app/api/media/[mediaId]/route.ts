import { NextResponse } from "next/server";
import { ApiError, handleApiError, requireHost } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(_request: Request, ctx: { params: Promise<{ mediaId: string }> }) {
  try {
    const { mediaId } = await ctx.params;
    const { supabase } = await requireHost();

    const { data: media, error } = await supabase.from("media").select("*").eq("id", mediaId).maybeSingle();
    if (error) throw error;
    if (!media) throw new ApiError("Media not found.", 404);

    const { error: deleteError } = await supabase.from("media").delete().eq("id", mediaId);
    if (deleteError) throw deleteError;

    // Best-effort cleanup of the uploaded file(s) in storage. Not fatal if it
    // fails -- an orphaned storage object is harmless in a private bucket.
    const admin = createAdminClient();
    const paths = [media.storage_path, media.original_storage_path].filter(Boolean) as string[];
    if (paths.length) {
      await admin.storage.from("quiz-media").remove(paths).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
