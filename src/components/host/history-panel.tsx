"use client";

import { useState } from "react";
import { useGameEvents } from "@/lib/realtime/use-game-events";
import { formatEventLine } from "@/lib/game/event-log";
import type { PublicTeam } from "@/lib/game/session-types";

export function HistoryPanel({ sessionId, teams }: { sessionId: string; teams: PublicTeam[] }) {
  const [open, setOpen] = useState(false);
  const events = useGameEvents(sessionId, open);
  const teamNameById = new Map(teams.map((t) => [t.id, t.name]));

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded px-2 py-1 text-muted hover:bg-white/10 hover:text-foreground">
        📜 History
      </button>
      {open && (
        <div className="fixed inset-0 z-[160] flex justify-end bg-black/60" onClick={() => setOpen(false)}>
          <div
            className="flex h-full w-full max-w-sm flex-col bg-background-elevated border-l border-border animate-float-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wide">Session history</h2>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-foreground" aria-label="Close history">
                ✕
              </button>
            </div>
            <ul className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 text-sm">
              {events.length === 0 && <li className="text-muted">No events yet.</li>}
              {events.map((event) => (
                <li key={event.id} className="border-b border-border/60 py-2 last:border-0">
                  <span className="mr-2 font-mono text-xs text-muted">
                    {new Date(event.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {formatEventLine({ type: event.type, payload: event.payload, createdAt: event.created_at }, teamNameById)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
