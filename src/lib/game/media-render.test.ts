import { describe, expect, it } from "vitest";
import { pairMediaForRender } from "./media-render";
import type { SessionMediaRow } from "@/types/database";

function media(partial: Partial<SessionMediaRow> & Pick<SessionMediaRow, "id" | "type" | "position">): SessionMediaRow {
  return {
    session_question_id: "q1",
    url: null,
    storage_path: null,
    youtube_id: null,
    youtube_start: null,
    youtube_end: null,
    youtube_audio_only: false,
    trim_start: null,
    trim_end: null,
    duration: null,
    ...partial,
  };
}

describe("pairMediaForRender", () => {
  it("renders a normal YouTube video as a single item", () => {
    const yt = media({ id: "1", type: "youtube", position: 0, youtube_id: "abc" });
    const items = pairMediaForRender([yt]);
    expect(items).toEqual([{ kind: "single", media: yt }]);
  });

  it("pairs an audio-only YouTube item with the next image in position order", () => {
    const yt = media({ id: "yt", type: "youtube", position: 0, youtube_id: "abc", youtube_audio_only: true });
    const img = media({ id: "img", type: "image", position: 1, url: "https://example.com/cover.jpg" });
    const items = pairMediaForRender([yt, img]);

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ kind: "youtube-with-cover", youtube: yt, cover: img });
  });

  it("does not render the cover image again as a separate item", () => {
    const yt = media({ id: "yt", type: "youtube", position: 0, youtube_audio_only: true });
    const img = media({ id: "img", type: "image", position: 1 });
    const items = pairMediaForRender([yt, img]);
    expect(items.some((i) => i.kind === "single" && i.media.id === "img")).toBe(false);
  });

  it("leaves an audio-only YouTube item with no cover if no image is attached", () => {
    const yt = media({ id: "yt", type: "youtube", position: 0, youtube_audio_only: true });
    const items = pairMediaForRender([yt]);
    expect(items).toEqual([{ kind: "youtube-with-cover", youtube: yt, cover: null }]);
  });

  it("does not consume unrelated images that come before other normal media", () => {
    const yt = media({ id: "yt", type: "youtube", position: 0, youtube_audio_only: true });
    const img1 = media({ id: "img1", type: "image", position: 1 });
    const img2 = media({ id: "img2", type: "image", position: 2 });
    const items = pairMediaForRender([yt, img1, img2]);

    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ kind: "youtube-with-cover", youtube: yt, cover: img1 });
    expect(items[1]).toEqual({ kind: "single", media: img2 });
  });

  it("keeps a non-audio-only YouTube item and images as separate single items", () => {
    const yt = media({ id: "yt", type: "youtube", position: 0, youtube_audio_only: false });
    const img = media({ id: "img", type: "image", position: 1 });
    const items = pairMediaForRender([yt, img]);
    expect(items).toEqual([
      { kind: "single", media: yt },
      { kind: "single", media: img },
    ]);
  });
});
