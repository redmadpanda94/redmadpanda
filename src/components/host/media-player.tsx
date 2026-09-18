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
            src={buildYoutubeEmbedUrl(media.youtube_id ?? "", media.youtube_start)}
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
