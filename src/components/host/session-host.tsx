"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSessionChannel } from "@/lib/realtime/use-session-channel";
import { useSoundEffects } from "@/lib/sound/use-sound-effects";
import { HostLobby } from "./host-lobby";
import { HostBoard } from "./host-board";
import { HostQuestion } from "./host-question";
import { HostFinalQuestion } from "./host-final-question";
import { HostFinished } from "./host-finished";
import { ConnectionBadge } from "./connection-badge";
import { HostToolbar } from "./host-toolbar";

export function SessionHost({
  sessionId,
  gameId,
  initialTitle,
  initialJoinCode,
}: {
  sessionId: string;
  gameId: string;
  initialTitle: string;
  initialJoinCode: string;
}) {
  const { playSound, SoundToggle } = useSoundEffects();
  const { state, connection } = useSessionChannel(sessionId, playSound);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  if (!state) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted">Loading session…</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex min-h-screen flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-2 text-xs text-muted">
        <div className="flex items-center gap-3">
          <span className="font-display text-sm font-semibold text-foreground">{state.title || initialTitle}</span>
          <span className="rounded bg-white/5 px-2 py-0.5 font-mono">{state.joinCode || initialJoinCode}</span>
          <ConnectionBadge connection={connection} />
        </div>
        <div className="flex items-center gap-3">
          {state.status !== "lobby" && state.status !== "finished" && <HostToolbar sessionId={sessionId} />}
          {SoundToggle}
          <button onClick={toggleFullscreen} className="rounded px-2 py-1 hover:bg-white/10">
            {fullscreen ? "⤡ Exit fullscreen" : "⤢ Fullscreen"}
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        {state.status === "lobby" && <HostLobby sessionId={sessionId} state={state} />}
        {state.status === "board" && <HostBoard sessionId={sessionId} state={state} />}
        {["question", "media", "buzzing", "answering", "scoring", "answer"].includes(state.status) && (
          <HostQuestion sessionId={sessionId} state={state} />
        )}
        {state.status === "final_question" && <HostFinalQuestion sessionId={sessionId} state={state} />}
        {state.status === "finished" && <HostFinished gameId={gameId} state={state} />}
        {state.status === "paused" && <PausedOverlay sessionId={sessionId} />}
      </div>
    </div>
  );
}

function PausedOverlay({ sessionId }: { sessionId: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      <div className="text-5xl">⏸</div>
      <h2 className="font-display text-2xl font-bold">Game paused</h2>
      <button
        className="rounded-xl bg-primary px-6 py-3 font-medium text-white hover:bg-primary-hover"
        onClick={() => fetch(`/api/sessions/${sessionId}/resume`, { method: "POST" })}
      >
        Resume
      </button>
    </div>
  );
}
