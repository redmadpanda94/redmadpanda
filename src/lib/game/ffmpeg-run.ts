import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { buildProbeArgs } from "./ffmpeg-args";

const execFileAsync = promisify(execFile);

function ffmpegPath(): string {
  return process.env.FFMPEG_PATH || "ffmpeg";
}

function ffprobePath(): string {
  return process.env.FFPROBE_PATH || "ffprobe";
}

export class FfmpegUnavailableError extends Error {
  constructor() {
    super("Video/audio processing is not available on this server (ffmpeg is not installed).");
  }
}

/** Runs ffmpeg with a fixed argv array -- never a shell string, so no argument can inject extra commands. */
export async function runFfmpeg(args: string[], timeoutMs = 120_000): Promise<void> {
  try {
    await execFileAsync(ffmpegPath(), args, { timeout: timeoutMs, maxBuffer: 1024 * 1024 * 16 });
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") throw new FfmpegUnavailableError();
    throw new Error("Video/audio processing failed. The file may be corrupted or in an unsupported format.");
  }
}

/** Best-effort duration probe; returns null rather than throwing so upload/trim UX still works without it. */
export async function probeDurationSeconds(inputPath: string): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync(ffprobePath(), buildProbeArgs(inputPath), { timeout: 15_000 });
    const seconds = parseFloat(stdout.trim());
    return Number.isFinite(seconds) ? seconds : null;
  } catch {
    return null;
  }
}
