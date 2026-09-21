"use client";

import { useEffect, useRef } from "react";
import { buildYoutubeEmbedUrl, youtubePlayerCommand } from "@/lib/game/youtube";
import type { SessionMediaRow } from "@/types/database";

export interface MediaPlaybackProps {
  /** false the instant a team buzzes in -- video/audio must stop right away. */
  playing?: boolean;
  /** Bump this to restart playback from 0:00 (the "Replay" button). */
  replaySignal?: number;
}

export function MediaPlayer({
  media,
  autoplay,
  playing = true,
  replaySignal = 0,
}: { media: SessionMediaRow; autoplay?: boolean } & MediaPlaybackProps) {
  switch (media.type) {
    case "image":
    case "gif":
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={media.url ?? ""} alt="" className="max-h-[36vh] w-auto rounded-xl object-contain shadow-2xl" />;
    case "youtube":
      // vw, not %: this box's parent centers its children instead of
      // stretching them, so a %-based width has no defined containing
      // block and collapses to a few hundred px (verified in a real
      // browser) instead of filling the available space.
      return (
        <div className="aspect-video w-[min(90vw,48rem,calc(36vh*16/9))] overflow-hidden rounded-xl shadow-2xl">
          <YoutubeFrame
            src={buildYoutubeEmbedUrl(media.youtube_id ?? "", media.youtube_start, media.youtube_end, autoplay)}
            title="YouTube video"
            playing={playing}
            replaySignal={replaySignal}
          />
        </div>
      );
    case "video":
      return (
        <VideoPlayer
          src={mediaSrc(media)}
          autoplay={autoplay}
          playing={playing}
          replaySignal={replaySignal}
          className="max-h-[40vh] w-auto rounded-xl shadow-2xl"
        />
      );
    case "audio":
      return (
        <div className="w-full max-w-md rounded-xl border border-border bg-background-card p-6 text-center">
          <div className="mb-3 text-4xl">🎵</div>
          <AudioPlayer src={mediaSrc(media)} autoplay={autoplay} playing={playing} replaySignal={replaySignal} className="w-full" />
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

interface HtmlMediaProps {
  src: string;
  autoplay?: boolean;
  playing: boolean;
  replaySignal: number;
  className: string;
}

/** Shared stop-on-buzz/replay logic for <video>/<audio> -- both act on the element directly, no server round-trip needed. */
function useHtmlMediaControl(playing: boolean, replaySignal: number) {
  const ref = useRef<HTMLMediaElement>(null);

  useEffect(() => {
    if (!playing) ref.current?.pause();
  }, [playing]);

  useEffect(() => {
    if (replaySignal === 0) return;
    const el = ref.current;
    if (!el) return;
    el.currentTime = 0;
    el.play().catch(() => {});
  }, [replaySignal]);

  return ref;
}

function VideoPlayer({ src, autoplay, playing, replaySignal, className }: HtmlMediaProps) {
  const ref = useHtmlMediaControl(playing, replaySignal);
  return <video ref={ref as React.RefObject<HTMLVideoElement>} src={src} controls autoPlay={autoplay} className={className} />;
}

function AudioPlayer({ src, autoplay, playing, replaySignal, className }: HtmlMediaProps) {
  const ref = useHtmlMediaControl(playing, replaySignal);
  return <audio ref={ref as React.RefObject<HTMLAudioElement>} src={src} controls autoPlay={autoplay} className={className} />;
}

/** YouTube iframe playback control via the postMessage Player API (enablejsapi=1, see buildYoutubeEmbedUrl). */
function YoutubeFrame({
  src,
  title,
  playing,
  replaySignal,
}: {
  src: string;
  title: string;
  playing: boolean;
  replaySignal: number;
}) {
  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!playing) ref.current?.contentWindow?.postMessage(youtubePlayerCommand("pauseVideo"), "*");
  }, [playing]);

  useEffect(() => {
    if (replaySignal === 0) return;
    const win = ref.current?.contentWindow;
    if (!win) return;
    win.postMessage(youtubePlayerCommand("seekTo", [0, true]), "*");
    win.postMessage(youtubePlayerCommand("playVideo"), "*");
  }, [replaySignal]);

  return (
    <iframe
      ref={ref}
      className="h-full w-full"
      src={src}
      title={title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
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
  playing = true,
  replaySignal = 0,
}: {
  youtube: SessionMediaRow;
  cover: SessionMediaRow | null;
  autoplay?: boolean;
} & MediaPlaybackProps) {
  return (
    <div className="relative aspect-video w-[min(90vw,48rem,calc(36vh*16/9))] overflow-hidden rounded-xl shadow-2xl">
      <div className="absolute inset-0">
        <YoutubeFrame
          src={buildYoutubeEmbedUrl(youtube.youtube_id ?? "", youtube.youtube_start, youtube.youtube_end, autoplay)}
          title="YouTube audio"
          playing={playing}
          replaySignal={replaySignal}
        />
      </div>
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
