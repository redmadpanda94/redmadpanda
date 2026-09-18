import { describe, expect, it } from "vitest";
import { buildTrimArgs, outputExtension, validateTrimRange } from "./ffmpeg-args";

describe("buildTrimArgs", () => {
  it("builds video args with -ss/-to as output options for frame-accurate seeking", () => {
    const args = buildTrimArgs("/tmp/in.mp4", "/tmp/out.mp4", { startSeconds: 32, endSeconds: 47, kind: "video" });
    expect(args).toEqual([
      "-y",
      "-i",
      "/tmp/in.mp4",
      "-ss",
      "32.000",
      "-to",
      "47.000",
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
      "/tmp/out.mp4",
    ]);
  });

  it("builds audio args without a video stream", () => {
    const args = buildTrimArgs("/tmp/in.mp3", "/tmp/out.mp3", { startSeconds: 5, endSeconds: 10.5, kind: "audio" });
    expect(args).toContain("-vn");
    expect(args).toContain("libmp3lame");
    expect(args).not.toContain("libx264");
  });

  it("never produces a single concatenated string (always a flat argv array)", () => {
    const args = buildTrimArgs("in; rm -rf /", "out.mp4", { startSeconds: 0, endSeconds: 1, kind: "video" });
    expect(args).toContain("in; rm -rf /");
    expect(args.some((a) => a.includes("&&") || a.includes("|"))).toBe(false);
  });
});

describe("outputExtension", () => {
  it("maps kinds to extensions", () => {
    expect(outputExtension("video")).toBe("mp4");
    expect(outputExtension("audio")).toBe("mp3");
  });
});

describe("validateTrimRange", () => {
  it("accepts a normal range", () => {
    expect(validateTrimRange(32, 47)).toBeNull();
  });

  it("rejects end <= start", () => {
    expect(validateTrimRange(10, 10)).toMatch(/after/);
    expect(validateTrimRange(10, 5)).toMatch(/after/);
  });

  it("rejects negative start", () => {
    expect(validateTrimRange(-1, 5)).toMatch(/negative/);
  });

  it("rejects clips over 10 minutes", () => {
    expect(validateTrimRange(0, 700)).toMatch(/10 minutes/);
  });
});
