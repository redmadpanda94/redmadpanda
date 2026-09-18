"use client";

import { useRef, useState } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { friendlyError, useToast } from "@/components/ui/toast";
import { formatTime } from "@/lib/utils";
import type { MediaRow } from "@/types/database";

export function MediaTrimDialog({
  media,
  onClose,
  onTrimmed,
}: {
  media: MediaRow;
  onClose: () => void;
  onTrimmed: (media: MediaRow) => void;
}) {
  const [duration, setDuration] = useState(media.duration ?? 0);
  const [start, setStart] = useState(media.trim_start ?? 0);
  const [end, setEnd] = useState(media.trim_end ?? media.duration ?? 0);
  const [pending, setPending] = useState(false);
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const toast = useToast();

  function onLoadedMetadata() {
    const el = mediaRef.current;
    if (!el) return;
    setDuration(el.duration);
    if (!media.trim_end) setEnd(el.duration);
  }

  function previewClip() {
    const el = mediaRef.current;
    if (!el) return;
    el.currentTime = start;
    el.play();
    const stopAtEnd = () => {
      if (el.currentTime >= end) {
        el.pause();
        el.removeEventListener("timeupdate", stopAtEnd);
      }
    };
    el.addEventListener("timeupdate", stopAtEnd);
  }

  async function save() {
    if (end <= start) {
      toast.show("End time must be after the start time.", "error");
      return;
    }
    setPending(true);
    try {
      const res = await fetch(`/api/media/${media.id}/trim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startSeconds: start, endSeconds: end }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      toast.show("Clip trimmed.", "success");
      onTrimmed(body.media);
    } catch (err) {
      toast.show(friendlyError(err, "Trimming failed. Make sure ffmpeg is installed on the server."), "error");
    } finally {
      setPending(false);
    }
  }

  const src = media.url ?? undefined;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
      <Card className="w-full max-w-lg animate-reveal">
        <CardBody>
          <h2 className="font-display text-lg font-semibold">Trim {media.type}</h2>

          <div className="mt-4 flex justify-center rounded-lg bg-black/40 p-2">
            {media.type === "video" ? (
              <video ref={mediaRef as React.RefObject<HTMLVideoElement>} src={src} onLoadedMetadata={onLoadedMetadata} controls className="max-h-64 rounded" />
            ) : (
              <audio ref={mediaRef as React.RefObject<HTMLAudioElement>} src={src} onLoadedMetadata={onLoadedMetadata} controls className="w-full" />
            )}
          </div>

          <p className="mt-2 text-center text-xs text-muted">Duration: {formatTime(duration)}</p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="start">Start (seconds)</Label>
              <Input
                id="start"
                type="number"
                min={0}
                max={duration}
                step={0.1}
                value={start}
                onChange={(e) => setStart(Math.max(0, Number(e.target.value)))}
              />
            </div>
            <div>
              <Label htmlFor="end">End (seconds)</Label>
              <Input
                id="end"
                type="number"
                min={0}
                max={duration}
                step={0.1}
                value={end}
                onChange={(e) => setEnd(duration ? Math.min(duration, Number(e.target.value)) : Number(e.target.value))}
              />
            </div>
          </div>

          <p className="mt-1 text-center text-xs text-muted">
            Clip length: {formatTime(Math.max(0, end - start))}
          </p>

          <div className="mt-4 flex justify-center gap-2">
            <Button variant="secondary" onClick={previewClip} type="button">
              ▶ Preview trimmed clip
            </Button>
          </div>

          <p className="mt-3 text-center text-[11px] text-muted">
            The original upload is kept untouched — this creates a new trimmed copy for playback.
          </p>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} disabled={pending}>
              {pending ? "Trimming…" : "Save trimmed clip"}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
