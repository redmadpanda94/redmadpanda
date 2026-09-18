"use client";

import { useEffect, useState } from "react";
import { useSessionAction } from "./session-actions";

const PRESETS = [5, 10, 15, 30, 60];

export function TimerControl({ sessionId, seconds, startedAt }: { sessionId: string; seconds: number | null; startedAt: string | null }) {
  const { call } = useSessionAction(sessionId);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (seconds === null || !startedAt) return;
    const end = new Date(startedAt).getTime() + seconds * 1000;
    const tick = () => setRemaining(Math.max(0, Math.round((end - Date.now()) / 1000)));
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [seconds, startedAt]);

  return (
    <div className="flex items-center gap-2">
      {remaining !== null ? (
        <span className={`font-display text-2xl font-bold tabular-nums ${remaining === 0 ? "text-danger" : "text-accent"}`}>
          {remaining === 0 ? "TIME!" : remaining}
        </span>
      ) : (
        <span className="text-xs text-muted">Timer off</span>
      )}
      <div className="flex gap-1">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => call("/timer", { seconds: p })}
            className="rounded bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
          >
            {p}s
          </button>
        ))}
        <button onClick={() => call("/timer", { seconds: null })} className="rounded bg-white/5 px-2 py-1 text-xs hover:bg-white/10">
          Off
        </button>
      </div>
    </div>
  );
}
