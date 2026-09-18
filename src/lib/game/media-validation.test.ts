import { describe, expect, it } from "vitest";
import { sanitizeFilename, validateUpload } from "./media-validation";

describe("validateUpload", () => {
  it("accepts a valid mp4 upload", () => {
    const result = validateUpload({ type: "video/mp4", size: 1024 * 1024, name: "clip.mp4" });
    expect(result.ok).toBe(true);
    expect(result.mediaType).toBe("video");
  });

  it("rejects an unsupported MIME type", () => {
    const result = validateUpload({ type: "application/x-msdownload", size: 100, name: "virus.exe" });
    expect(result.ok).toBe(false);
  });

  it("rejects a file over the per-type size limit", () => {
    const result = validateUpload({ type: "image/png", size: 999 * 1024 * 1024, name: "huge.png" });
    expect(result.ok).toBe(false);
  });

  it("rejects a mismatched extension (spoofed content type)", () => {
    const result = validateUpload({ type: "video/mp4", size: 1024, name: "clip.exe" });
    expect(result.ok).toBe(false);
  });

  it("rejects an empty file", () => {
    const result = validateUpload({ type: "image/png", size: 0, name: "empty.png" });
    expect(result.ok).toBe(false);
  });
});

describe("sanitizeFilename", () => {
  it("strips the extension and unsafe characters", () => {
    expect(sanitizeFilename("My Cool Clip #1.mp4")).toBe("My-Cool-Clip-1");
  });

  it("falls back to a default when nothing safe remains", () => {
    expect(sanitizeFilename("???.mp4")).toBe("file");
  });

  it("truncates very long names", () => {
    const long = "a".repeat(200) + ".png";
    expect(sanitizeFilename(long).length).toBeLessThanOrEqual(60);
  });
});
