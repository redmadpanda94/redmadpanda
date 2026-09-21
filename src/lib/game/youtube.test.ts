import { describe, expect, it } from "vitest";
import { buildYoutubeEmbedUrl, parseYoutubeUrl, youtubePlayerCommand } from "./youtube";

describe("parseYoutubeUrl", () => {
  it("parses a standard watch URL", () => {
    expect(parseYoutubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({
      videoId: "dQw4w9WgXcQ",
      startSeconds: null,
    });
  });

  it("parses a youtu.be short link", () => {
    expect(parseYoutubeUrl("https://youtu.be/dQw4w9WgXcQ")).toEqual({
      videoId: "dQw4w9WgXcQ",
      startSeconds: null,
    });
  });

  it("parses an embed URL", () => {
    expect(parseYoutubeUrl("https://www.youtube.com/embed/dQw4w9WgXcQ")?.videoId).toBe("dQw4w9WgXcQ");
  });

  it("parses a shorts URL", () => {
    expect(parseYoutubeUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ")?.videoId).toBe("dQw4w9WgXcQ");
  });

  it("parses numeric start time from ?t=", () => {
    expect(parseYoutubeUrl("https://youtu.be/dQw4w9WgXcQ?t=90")?.startSeconds).toBe(90);
  });

  it("parses composite start time like 1m30s", () => {
    expect(parseYoutubeUrl("https://youtu.be/dQw4w9WgXcQ?t=1m30s")?.startSeconds).toBe(90);
  });

  it("returns null for non-YouTube URLs", () => {
    expect(parseYoutubeUrl("https://vimeo.com/12345")).toBeNull();
  });

  it("returns null for garbage input", () => {
    expect(parseYoutubeUrl("not a url")).toBeNull();
  });

  it("returns null when video id is missing or malformed", () => {
    expect(parseYoutubeUrl("https://www.youtube.com/watch")).toBeNull();
    expect(parseYoutubeUrl("https://www.youtube.com/watch?v=short")).toBeNull();
  });
});

describe("buildYoutubeEmbedUrl", () => {
  it("uses the privacy-enhanced domain and includes start time when given", () => {
    const url = buildYoutubeEmbedUrl("dQw4w9WgXcQ", 90);
    expect(url).toContain("youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(url).toContain("start=90");
  });

  it("omits start param when not provided", () => {
    const url = buildYoutubeEmbedUrl("dQw4w9WgXcQ");
    expect(url).not.toContain("start=");
  });

  it("includes end time and autoplay when given, for playing just a clip", () => {
    const url = buildYoutubeEmbedUrl("dQw4w9WgXcQ", 32, 47, true);
    expect(url).toContain("start=32");
    expect(url).toContain("end=47");
    expect(url).toContain("autoplay=1");
  });

  it("omits end and autoplay when not requested", () => {
    const url = buildYoutubeEmbedUrl("dQw4w9WgXcQ", 32);
    expect(url).not.toContain("end=");
    expect(url).not.toContain("autoplay=");
  });

  it("always enables the postMessage player API, for stop-on-buzz and replay", () => {
    expect(buildYoutubeEmbedUrl("dQw4w9WgXcQ")).toContain("enablejsapi=1");
  });
});

describe("youtubePlayerCommand", () => {
  it("builds a pauseVideo command with no args", () => {
    expect(JSON.parse(youtubePlayerCommand("pauseVideo"))).toEqual({ event: "command", func: "pauseVideo", args: [] });
  });

  it("builds a seekTo command with args", () => {
    expect(JSON.parse(youtubePlayerCommand("seekTo", [0, true]))).toEqual({ event: "command", func: "seekTo", args: [0, true] });
  });
});
