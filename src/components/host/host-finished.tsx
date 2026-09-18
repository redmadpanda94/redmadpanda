"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatScore } from "@/lib/utils";
import { friendlyError, useToast } from "@/components/ui/toast";
import type { SessionPublicState } from "@/lib/game/session-types";

const MEDALS = ["🥇", "🥈", "🥉"];

export function HostFinished({ gameId, state }: { gameId: string; state: SessionPublicState }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const ranked = [...state.teams].sort((a, b) => b.score - a.score);

  async function playAgain() {
    setPending(true);
    try {
      const res = await fetch(`/api/games/${gameId}/sessions`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      router.push(`/play/${body.session.id}`);
    } catch (err) {
      toast.show(friendlyError(err), "error");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-10 text-center">
      <div className="animate-reveal">
        <p className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-accent">Game Over</p>
        <h1 className="mt-2 font-display text-4xl font-bold">{state.title}</h1>
      </div>

      <div className="flex w-full max-w-md flex-col gap-3">
        {ranked.map((team, i) => (
          <div
            key={team.id}
            className="flex items-center gap-4 rounded-2xl border border-border bg-background-card px-5 py-4 animate-float-in"
            style={{ animationDelay: `${i * 120}ms` }}
          >
            <span className="text-2xl">{MEDALS[i] ?? `${i + 1}.`}</span>
            <span className="flex-1 text-left font-display text-lg font-semibold">{team.name}</span>
            <span className="font-display text-2xl font-bold tabular-nums text-accent">{formatScore(team.score)}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={playAgain}
          disabled={pending}
          className="rounded-xl bg-primary px-6 py-3 font-display font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {pending ? "Starting…" : "🔁 Play Again"}
        </button>
        <Link href="/dashboard" className="rounded-xl bg-white/5 px-6 py-3 font-display font-semibold hover:bg-white/10">
          Back to Library
        </Link>
      </div>
    </div>
  );
}
