"use client";

import { useEffect, useRef, useState } from "react";
import { formatScore } from "@/lib/utils";
import { useSessionAction } from "./session-actions";
import { useConfirm } from "@/components/ui/confirm-provider";
import type { PublicTeam } from "@/lib/game/session-types";

export function Scoreboard({ teams, sessionId }: { teams: PublicTeam[]; sessionId: string }) {
  const sorted = [...teams].sort((a, b) => b.score - a.score);
  const { call, pending } = useSessionAction(sessionId);

  return (
    <div className="flex flex-wrap items-start justify-center gap-3 px-4 py-3">
      {sorted.map((team) => (
        <TeamScore
          key={team.id}
          team={team}
          disabled={pending !== null}
          onApplyDelta={(delta) => call("/score", { teamId: team.id, delta })}
          onRemove={() => call(`/teams/${team.id}`, undefined, "DELETE")}
        />
      ))}
      {teams.length > 0 && (
        <button
          disabled={pending !== null}
          onClick={() => call("/score/undo")}
          className="self-center rounded-lg px-2 py-1 text-xs text-muted hover:bg-white/10 hover:text-foreground disabled:opacity-40"
        >
          ↺ Undo last score change
        </button>
      )}
    </div>
  );
}

function TeamScore({
  team,
  disabled,
  onApplyDelta,
  onRemove,
}: {
  team: PublicTeam;
  disabled: boolean;
  onApplyDelta: (delta: number) => void;
  onRemove: () => void;
}) {
  const [pop, setPop] = useState(false);
  const prevScore = useRef(team.score);
  const [amount, setAmount] = useState("");
  const confirm = useConfirm();

  useEffect(() => {
    if (prevScore.current !== team.score) {
      setPop(true);
      prevScore.current = team.score;
      const t = setTimeout(() => setPop(false), 500);
      return () => clearTimeout(t);
    }
  }, [team.score]);

  function applyCustom(sign: 1 | -1) {
    const parsed = Number(amount);
    if (!amount || !Number.isFinite(parsed) || parsed <= 0) return;
    onApplyDelta(sign * parsed);
    setAmount("");
  }

  async function removeTeam() {
    const ok = await confirm({
      title: `Remove "${team.name}"?`,
      description: "Use this to clear a stale entry (e.g. a team that rejoined on a new device). This can't be undone.",
      tone: "danger",
      confirmLabel: "Remove",
    });
    if (!ok) return;
    onRemove();
  }

  return (
    <div className="flex min-w-[170px] flex-col items-center gap-1.5 rounded-xl border border-border bg-background-card px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <span className={`h-1.5 w-1.5 rounded-full ${team.connected ? "bg-success" : "bg-danger"}`} />
        <span className="truncate max-w-[140px]">{team.name}</span>
      </div>
      <div className={`font-display text-2xl font-bold tabular-nums ${pop ? "animate-score-pop text-accent" : ""}`}>
        {formatScore(team.score)}
      </div>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          placeholder="Amt"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-6 w-14 rounded border border-border bg-background px-1 text-center text-xs tabular-nums"
        />
        <button
          disabled={disabled || !amount}
          onClick={() => applyCustom(1)}
          className="rounded bg-success/15 px-1.5 py-0.5 text-xs font-medium text-success hover:bg-success/25 disabled:opacity-40"
          aria-label={`Add points to ${team.name}`}
        >
          +
        </button>
        <button
          disabled={disabled || !amount}
          onClick={() => applyCustom(-1)}
          className="rounded bg-danger/15 px-1.5 py-0.5 text-xs font-medium text-danger hover:bg-danger/25 disabled:opacity-40"
          aria-label={`Subtract points from ${team.name}`}
        >
          −
        </button>
        <button
          disabled={disabled}
          onClick={removeTeam}
          className="rounded px-1.5 py-0.5 text-xs text-muted hover:bg-danger/20 hover:text-danger disabled:opacity-40"
          aria-label={`Remove ${team.name}`}
          title="Remove team"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
