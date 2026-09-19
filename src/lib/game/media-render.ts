import type { SessionMediaRow } from "@/types/database";

export type MediaRenderItem =
  | { kind: "single"; media: SessionMediaRow }
  | { kind: "youtube-with-cover"; youtube: SessionMediaRow; cover: SessionMediaRow | null };

/**
 * A YouTube item marked "audio only" has no official way to hide its video
 * track (spec section 13: no downloading/bypassing), so the practical fix
 * is to keep the official embed playing and visually cover it with another
 * image/gif on the same question. This pairs each audio-only YouTube item
 * with the next not-yet-claimed image/gif in position order, and removes
 * that image from the flat render list so it isn't shown twice.
 */
export function pairMediaForRender(media: SessionMediaRow[]): MediaRenderItem[] {
  const sorted = [...media].sort((a, b) => a.position - b.position);
  const claimedCoverIds = new Set<string>();

  const items: MediaRenderItem[] = sorted.map((item) => {
    if (item.type === "youtube" && item.youtube_audio_only) {
      const cover = sorted.find(
        (m) => (m.type === "image" || m.type === "gif") && !claimedCoverIds.has(m.id)
      );
      if (cover) claimedCoverIds.add(cover.id);
      return { kind: "youtube-with-cover", youtube: item, cover: cover ?? null };
    }
    return { kind: "single", media: item };
  });

  return items.filter((item) => !(item.kind === "single" && claimedCoverIds.has(item.media.id)));
}
