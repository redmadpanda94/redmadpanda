"use client";

import { buildYoutubeEmbedUrl } from "@/lib/game/youtube";
import type { SessionMediaRow } from "@/types/database";

export function MediaPlayer({ media, autoplay }: { media: SessionMediaRow; autoplay?: boolean }) {
  switch (media.type) {
    case "image":
    case "gif":
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={media.url ?? ""} alt="" className="max-h-[50vh] w-auto rounded-xl object-contain shadow-2xl" />;
    case "youtube":
      return (
        <div className="aspect-video w-full max-w-3xl overflow-hidden rounded-xl shadow-2xl">
          <iframe
            className="h-full w-full"
            src={buildYoutubeEmbedUrl(media.youtube_id ?? "", media.youtube_start, media.youtube_end)}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    case "video":
      return (
        <video
          src={mediaSrc(media)}
          controls
          autoPlay={autoplay}
          className="max-h-[55vh] w-auto rounded-xl shadow-2xl"
        />
      );
    case "audio":
      return (
        <div className="w-full max-w-md rounded-xl border border-border bg-background-card p-6 text-center">
          <div className="mb-3 text-4xl">🎵</div>
          <audio src={mediaSrc(media)} controls autoPlay={autoplay} className="w-full" />
        </div>
      );
    default:
      return null;
  }
}

function mediaSrc(media: SessionMediaRow): string {
  if (media.trim_start !== null && media.trim_end !== null && media.url) {
    return `${media.url}#t=${media.trim_start},${media.trim_end}`;
  }
  return media.url ?? "";
}

/**
 * "Audio only" YouTube: no official player mode hides the video track, so
 * we keep the official embed playing underneath (audio-safe -- it's still
 * rendered, just visually covered) and stack a cover image on top. Falls
 * back to a generic "now playing" card when no cover image was attached.
 */
export function YoutubeWithCover({
  youtube,
  cover,
  autoplay,
}: {
  youtube: SessionMediaRow;
  cover: SessionMediaRow | null;
  autoplay?: boolean;
}) {
  return (
    <div className="relative aspect-video w-full max-w-3xl overflow-hidden rounded-xl shadow-2xl">
      <iframe
        className="absolute inset-0 h-full w-full"
        src={buildYoutubeEmbedUrl(youtube.youtube_id ?? "", youtube.youtube_start, youtube.youtube_end, autoplay)}
        title="YouTube audio"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background">
        {cover?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover.url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted">
            <span className="text-5xl">🎵</span>
            <span className="text-sm">Now playing…</span>
          </div>
        )}
      </div>
    </div>
  );
}
