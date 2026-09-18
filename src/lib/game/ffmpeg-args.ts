export type TrimKind = "video" | "audio";

export interface TrimRequest {
  startSeconds: number;
  endSeconds: number;
  kind: TrimKind;
}

export function outputExtension(kind: TrimKind): string {
  return kind === "video" ? "mp4" : "mp3";
}

/**
 * Builds the ffmpeg argument list for a trim, as an array (never a shell
 * string) so it is passed straight to execFile with no shell interpolation
 * -- untrusted values (paths, timestamps) can never be used for command
 * injection (spec section 42).
 *
 * -ss/-to are given as OUTPUT options (after -i) for frame-accurate
 * seeking, which matters for short quiz clips where a half-second of drift
 * is noticeable.
 */
export function buildTrimArgs(inputPath: string, outputPath: string, req: TrimRequest): string[] {
  const { startSeconds, endSeconds, kind } = req;
  const base = ["-y", "-i", inputPath, "-ss", startSeconds.toFixed(3), "-to", endSeconds.toFixed(3)];

  if (kind === "video") {
    return [
      ...base,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      outputPath,
    ];
  }

  return [...base, "-vn", "-c:a", "libmp3lame", "-b:a", "192k", outputPath];
}

export function buildProbeArgs(inputPath: string): string[] {
  return ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", inputPath];
}

const MAX_CLIP_SECONDS = 600;

export function validateTrimRange(startSeconds: number, endSeconds: number): string | null {
  if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds)) return "Invalid trim range.";
  if (startSeconds < 0) return "Start time can't be negative.";
  if (endSeconds <= startSeconds) return "End time must be after the start time.";
  if (endSeconds - startSeconds > MAX_CLIP_SECONDS) return "Clips can be at most 10 minutes long.";
  return null;
}
