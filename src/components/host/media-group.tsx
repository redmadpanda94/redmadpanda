"use client";

import { pairMediaForRender } from "@/lib/game/media-render";
import { MediaPlayer, YoutubeWithCover, type MediaPlaybackProps } from "./media-player";
import type { SessionMediaRow } from "@/types/database";

/** Renders a question's media items, pairing audio-only YouTube items with their cover image. */
export function MediaGroup({
  media,
  autoplay,
  playing = true,
  replaySignal = 0,
}: { media: SessionMediaRow[]; autoplay?: boolean } & MediaPlaybackProps) {
  const items = pairMediaForRender(media);
  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 animate-reveal">
      {items.map((item) =>
        item.kind === "single" ? (
          <MediaPlayer key={item.media.id} media={item.media} autoplay={autoplay} playing={playing} replaySignal={replaySignal} />
        ) : (
          <YoutubeWithCover
            key={item.youtube.id}
            youtube={item.youtube}
            cover={item.cover}
            autoplay={autoplay}
            playing={playing}
            replaySignal={replaySignal}
          />
        )
      )}
    </div>
  );
}
