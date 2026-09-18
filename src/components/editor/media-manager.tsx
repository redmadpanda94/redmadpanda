"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { friendlyError, useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-provider";
import { parseYoutubeUrl } from "@/lib/game/youtube";
import type { MediaRow } from "@/types/database";

const TABS = ["image", "youtube", "upload"] as const;
type Tab = (typeof TABS)[number];

export function MediaManager({
  questionId,
  media,
  onChange,
}: {
  questionId: string;
  media: MediaRow[];
  onChange: (media: MediaRow[]) => void;
}) {
  const [tab, setTab] = useState<Tab>("image");
  const toast = useToast();
  const confirm = useConfirm();

  async function removeMedia(id: string) {
    const ok = await confirm({ title: "Remove this media item?", tone: "danger", confirmLabel: "Remove" });
    if (!ok) return;
    try {
      const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      onChange(media.filter((m) => m.id !== id));
    } catch (err) {
      toast.show(friendlyError(err), "error");
    }
  }

  function addMedia(item: MediaRow) {
    onChange([...media, item]);
  }

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
        Media ({media.length}) — multiple items allowed
      </p>

      {media.length > 0 && (
        <ul className="mb-3 flex flex-col gap-2">
          {media.map((item) => (
            <li key={item.id} className="flex items-center gap-2 rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm">
              <MediaThumb item={item} />
              <span className="flex-1 truncate text-muted">{mediaLabel(item)}</span>
              <button className="text-xs text-danger hover:underline" onClick={() => removeMedia(item.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mb-2 flex gap-1 rounded-lg bg-background-elevated p-1 text-xs">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md py-1.5 capitalize transition-colors ${tab === t ? "bg-primary text-white" : "text-muted hover:text-foreground"}`}
          >
            {t === "image" ? "Image/GIF URL" : t === "youtube" ? "YouTube" : "Upload file"}
          </button>
        ))}
      </div>

      {tab === "image" && <AddImageForm questionId={questionId} onAdded={addMedia} />}
      {tab === "youtube" && <AddYoutubeForm questionId={questionId} onAdded={addMedia} />}
      {tab === "upload" && <UploadForm questionId={questionId} onAdded={addMedia} />}
    </div>
  );
}

function mediaLabel(item: MediaRow): string {
  switch (item.type) {
    case "youtube":
      return `YouTube: ${item.youtube_id}`;
    case "image":
      return item.url ?? item.storage_path ?? "Image";
    case "gif":
      return item.url ?? item.storage_path ?? "GIF";
    case "video":
      return item.storage_path ?? item.url ?? "Video";
    case "audio":
      return item.storage_path ?? item.url ?? "Audio";
    default:
      return "Media";
  }
}

function MediaThumb({ item }: { item: MediaRow }) {
  if ((item.type === "image" || item.type === "gif") && item.url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.url} alt="" className="h-9 w-9 rounded object-cover" />;
  }
  const icon = { youtube: "▶", video: "🎬", audio: "🎵", image: "🖼", gif: "🖼" }[item.type];
  return <span className="flex h-9 w-9 items-center justify-center rounded bg-white/5 text-base">{icon}</span>;
}

async function createMedia(questionId: string, payload: Record<string, unknown>): Promise<MediaRow> {
  const res = await fetch(`/api/questions/${questionId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error);
  return body.media;
}

function AddImageForm({ questionId, onAdded }: { questionId: string; onAdded: (m: MediaRow) => void }) {
  const [url, setUrl] = useState("");
  const [type, setType] = useState<"image" | "gif">("image");
  const [pending, setPending] = useState(false);
  const toast = useToast();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const media = await createMedia(questionId, { type, url });
      onAdded(media);
      setUrl("");
    } catch (err) {
      toast.show(friendlyError(err), "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <Select value={type} onChange={(e) => setType(e.target.value as "image" | "gif")} className="w-24">
        <option value="image">Image</option>
        <option value="gif">GIF</option>
      </Select>
      <Input required type="url" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
      <Button type="submit" size="sm" disabled={pending}>
        Add
      </Button>
    </form>
  );
}

function AddYoutubeForm({ questionId, onAdded }: { questionId: string; onAdded: (m: MediaRow) => void }) {
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const toast = useToast();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseYoutubeUrl(url);
    if (!parsed) {
      toast.show("That doesn't look like a valid YouTube URL.", "error");
      return;
    }
    setPending(true);
    try {
      const media = await createMedia(questionId, {
        type: "youtube",
        url,
        youtubeId: parsed.videoId,
        youtubeStart: parsed.startSeconds ?? undefined,
      });
      onAdded(media);
      setUrl("");
    } catch (err) {
      toast.show(friendlyError(err), "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <Input required type="url" placeholder="https://youtube.com/watch?v=…" value={url} onChange={(e) => setUrl(e.target.value)} />
      <Button type="submit" size="sm" disabled={pending}>
        Add
      </Button>
    </form>
  );
}

function UploadForm({ questionId, onAdded }: { questionId: string; onAdded: (m: MediaRow) => void }) {
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  async function handleFile(file: File) {
    setPending(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("questionId", questionId);
      const res = await fetch("/api/media/upload", { method: "POST", body: form });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      const media = await createMedia(questionId, {
        type: body.mediaType,
        url: body.url,
        storagePath: body.storagePath,
      });
      onAdded(media);
    } catch (err) {
      toast.show(friendlyError(err, "Upload failed. Please check the file format."), "error");
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav,audio/mp4"
        disabled={pending}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
        className="block w-full text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-primary-hover"
      />
      <p className="mt-1.5 text-[11px] text-muted">MP4/WebM/MOV video, MP3/WAV/M4A audio, or images. Trim video/audio after uploading.</p>
      {pending && <p className="mt-1 text-xs text-primary">Uploading…</p>}
    </div>
  );
}
