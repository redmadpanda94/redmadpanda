import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextResponse } from "next/server";
import { ApiError, handleApiError, parseJson, requireHost } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildTrimArgs, outputExtension, validateTrimRange } from "@/lib/game/ffmpeg-args";
import { FfmpegUnavailableError, runFfmpeg } from "@/lib/game/ffmpeg-run";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({ startSeconds: z.number(), endSeconds: z.number() });

const BUCKET = "quiz-media";

/**
 * Trims an uploaded video/audio file with ffmpeg. The original upload is
 * never modified or deleted -- it's preserved at `original_storage_path`
 * while `storage_path`/`url` point at the newly trimmed, playable clip
 * (spec section 11).
 */
export async function POST(request: Request, ctx: { params: Promise<{ mediaId: string }> }) {
  let workDir: string | null = null;
  try {
    const { mediaId } = await ctx.params;
    const { supabase, user } = await requireHost();
    const { startSeconds, endSeconds } = await parseJson(request, schema);

    const rangeError = validateTrimRange(startSeconds, endSeconds);
    if (rangeError) throw new ApiError(rangeError, 400);

    const { data: media, error } = await supabase.from("media").select("*").eq("id", mediaId).maybeSingle();
    if (error) throw error;
    if (!media) throw new ApiError("Media not found.", 404);
    if (media.type !== "video" && media.type !== "audio") {
      throw new ApiError("Only uploaded video or audio can be trimmed.", 400);
    }
    const sourcePath: string | null = media.original_storage_path ?? media.storage_path;
    if (!sourcePath) throw new ApiError("This media has no uploaded file to trim.", 400);

    const admin = createAdminClient();
    const { data: downloaded, error: downloadError } = await admin.storage.from(BUCKET).download(sourcePath);
    if (downloadError || !downloaded) throw new ApiError("Couldn't read the original file for trimming.", 500);

    workDir = await mkdtemp(path.join(tmpdir(), "quiznight-trim-"));
    const ext = outputExtension(media.type);
    const inputPath = path.join(workDir, `input${path.extname(sourcePath) || ".bin"}`);
    const outputPath = path.join(workDir, `output.${ext}`);

    await writeFile(inputPath, Buffer.from(await downloaded.arrayBuffer()));
    await runFfmpeg(buildTrimArgs(inputPath, outputPath, { startSeconds, endSeconds, kind: media.type }));

    const trimmedBuffer = await readFile(outputPath);
    const newPath = `${user.id}/trimmed/${randomUUID()}.${ext}`;
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(newPath, trimmedBuffer, {
      contentType: media.type === "video" ? "video/mp4" : "audio/mpeg",
      upsert: false,
    });
    if (uploadError) throw new ApiError("Couldn't save the trimmed clip.", 500);

    const {
      data: { publicUrl },
    } = admin.storage.from(BUCKET).getPublicUrl(newPath);

    const { data: updated, error: updateError } = await supabase
      .from("media")
      .update({
        storage_path: newPath,
        original_storage_path: sourcePath,
        url: publicUrl,
        trim_start: startSeconds,
        trim_end: endSeconds,
        duration: endSeconds - startSeconds,
      })
      .eq("id", mediaId)
      .select()
      .single();
    if (updateError) throw updateError;

    return NextResponse.json({ media: updated });
  } catch (error) {
    if (error instanceof FfmpegUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return handleApiError(error);
  } finally {
    if (workDir) await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
