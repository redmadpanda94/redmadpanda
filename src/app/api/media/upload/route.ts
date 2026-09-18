import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ApiError, handleApiError, requireHost } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeFilename, validateUpload } from "@/lib/game/media-validation";

export const runtime = "nodejs";

/**
 * Handles direct file uploads for images/GIFs/video/audio (spec sections
 * 9-11, 42). Validates MIME type + extension + size server-side (never
 * trusts the browser's Content-Type alone), then stores the original under
 * a random, non-guessable path in the private-by-default "quiz-media"
 * bucket. Never executes or interprets the uploaded file.
 */
export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireHost();

    const form = await request.formData();
    const file = form.get("file");
    const questionId = form.get("questionId");
    if (!(file instanceof File)) throw new ApiError("No file provided.", 400);
    if (typeof questionId !== "string" || !questionId) throw new ApiError("Missing questionId.", 400);

    const { data: question } = await supabase.from("questions").select("id").eq("id", questionId).maybeSingle();
    if (!question) throw new ApiError("Question not found.", 404);

    const validation = validateUpload({ type: file.type, size: file.size, name: file.name });
    if (!validation.ok || !validation.mediaType || !validation.extension) {
      throw new ApiError(validation.error ?? "Invalid file.", 400);
    }

    const path = `${user.id}/${questionId}/${randomUUID()}-${sanitizeFilename(file.name)}.${validation.extension}`;
    const admin = createAdminClient();
    const { error: uploadError } = await admin.storage.from("quiz-media").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) throw new ApiError("Upload failed. Please check the file format and try again.", 500);

    const {
      data: { publicUrl },
    } = admin.storage.from("quiz-media").getPublicUrl(path);

    return NextResponse.json({
      storagePath: path,
      url: publicUrl,
      mediaType: validation.mediaType,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
