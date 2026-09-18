"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { TeamBuzzView } from "@/lib/game/team-buzz-view";

export function BuzzButton({
  sessionId,
  teamId,
  token,
  view,
}: {
  sessionId: string;
  teamId: string;
  token: string;
  view: TeamBuzzView;
}) {
  const [sending, setSending] = useState(false);
  const canBuzz = view.kind === "ready_to_buzz" && !sending;

  async function buzz() {
    if (!canBuzz) return;
    setSending(true);
    if (navigator.vibrate) navigator.vibrate(60);
    const start = performance.now();
    try {
      await fetch(`/api/sessions/${sessionId}/buzz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, token, clientLatencyMs: Math.round(performance.now() - start) }),
      });
    } catch {
      // realtime state update will reconcile regardless
    } finally {
      setSending(false);
    }
  }

  const { label, sublabel, tone } = describe(view);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-10">
      <button
        onClick={buzz}
        disabled={!canBuzz}
        aria-label="Buzz"
        className={cn(
          "flex aspect-square w-[min(70vw,320px)] select-none items-center justify-center rounded-full font-display text-4xl font-black uppercase tracking-wide shadow-2xl transition-all duration-150 active:scale-95",
          tone === "ready" && "bg-gradient-to-b from-danger to-red-700 text-white animate-pulse-ring cursor-pointer",
          tone === "success" && "bg-gradient-to-b from-success to-emerald-700 text-white",
          tone === "info" && "bg-gradient-to-b from-primary to-primary-hover text-white cursor-default",
          tone === "muted" && "bg-white/10 text-white/40 cursor-not-allowed"
        )}
      >
        {label}
      </button>
      {sublabel && <p className="max-w-xs text-center text-sm text-muted">{sublabel}</p>}
    </div>
  );
}

function describe(view: TeamBuzzView): { label: string; sublabel?: string; tone: "ready" | "success" | "info" | "muted" } {
  switch (view.kind) {
    case "ready_to_buzz":
      return { label: "BUZZ", tone: "ready" };
    case "buzzed":
      return { label: `#${view.rank}`, sublabel: view.rank === 1 ? "You're first!" : `You buzzed ${ordinal(view.rank)}`, tone: "info" };
    case "you_may_answer":
      return { label: "ANSWER!", sublabel: "The host has selected your team", tone: "success" };
    case "other_answering":
      return { label: "WAIT", sublabel: `${view.teamName} is answering`, tone: "muted" };
    case "correct":
      return { label: "✓", sublabel: "Correct!", tone: "success" };
    case "incorrect":
      return { label: "✕", sublabel: "Wrong answer", tone: "muted" };
    case "locked":
      return { label: "…", sublabel: "Buzzers closed", tone: "muted" };
    case "waiting":
      return { label: "…", sublabel: view.message, tone: "muted" };
  }
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}
