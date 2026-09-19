export interface ParsedYoutube {
  videoId: string;
  startSeconds: number | null;
}

const ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Parses standard YouTube URL formats (watch, youtu.be, embed, shorts) and
 * an optional start time (?t=90 / ?t=1m30s / &start=90). Returns null for
 * anything that isn't a recognizable YouTube URL — we never try to guess.
 */
export function parseYoutubeUrl(input: string): ParsedYoutube | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");
  let videoId: string | null = null;

  if (host === "youtu.be") {
    videoId = url.pathname.slice(1).split("/")[0] || null;
  } else if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    if (url.pathname === "/watch") {
      videoId = url.searchParams.get("v");
    } else if (url.pathname.startsWith("/embed/")) {
      videoId = url.pathname.split("/")[2] || null;
    } else if (url.pathname.startsWith("/shorts/")) {
      videoId = url.pathname.split("/")[2] || null;
    } else if (url.pathname.startsWith("/live/")) {
      videoId = url.pathname.split("/")[2] || null;
    }
  } else {
    return null;
  }

  if (!videoId || !ID_PATTERN.test(videoId)) return null;

  const startSeconds = parseStartTime(url.searchParams.get("t") ?? url.searchParams.get("start"));

  return { videoId, startSeconds };
}

function parseStartTime(raw: string | null): number | null {
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return parseInt(raw, 10);

  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(raw);
  if (!match || !match[0]) return null;
  const [, h, m, s] = match;
  if (!h && !m && !s) return null;
  return (parseInt(h ?? "0", 10) * 3600) + (parseInt(m ?? "0", 10) * 60) + parseInt(s ?? "0", 10);
}

export function buildYoutubeEmbedUrl(
  videoId: string,
  startSeconds?: number | null,
  endSeconds?: number | null,
  autoplay?: boolean
): string {
  const params = new URLSearchParams({ rel: "0", modestbranding: "1" });
  if (startSeconds) params.set("start", String(startSeconds));
  if (endSeconds) params.set("end", String(endSeconds));
  if (autoplay) params.set("autoplay", "1");
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}
