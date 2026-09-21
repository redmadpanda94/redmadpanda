"use client";

import { useState } from "react";
import { cn, formatScore } from "@/lib/utils";
import { useSessionAction } from "./session-actions";
import type { SessionPublicState } from "@/lib/game/session-types";

const MEDALS = ["🥇", "🥈", "🥉"];

export function BuzzerPanel({ sessionId, state }: { sessionId: string; state: SessionPublicState }) {
  const { call, pending } = useSessionAction(sessionId);
  const busy = pending !== null;

  async function enableBuzzers() {
    await call("/buzzers", { open: true }, "PATCH");
  }
  async function disableBuzzers() {
    await call("/buzzers", { open: false }, "PATCH");
  }
  async function clearBuzzers() {
    await call("/buzzers/clear");
  }
  async function selectTeam(teamId: string | null) {
    await call("/select-team", { teamId });
  }
  async function markAnswer(teamId: string, outcome: "correct" | "incorrect") {
    await call("/answer", { teamId, outcome });
  }

  if (state.status === "question" || state.status === "media") {
    return (
      <div className="flex flex-col items-center gap-3">
        <button
          disabled={busy}
          onClick={enableBuzzers}
          className="rounded-xl bg-primary px-6 py-3 font-display text-lg font-semibold text-white shadow-lg shadow-primary/30 transition-transform hover:scale-[1.02] hover:bg-primary-hover disabled:opacity-50"
        >
          🔔 Enable Buzzers
        </button>
      </div>
    );
  }

  const hasQueue = state.buzzQueue.length > 0;

  return (
    <div className="w-full max-w-xl">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted">Buzz order</h3>
        <div className="flex gap-2">
          {state.buzzersOpen ? (
            <button disabled={busy} onClick={disableBuzzers} className="text-xs text-muted hover:text-foreground">
              Disable buzzers
            </button>
          ) : (
            <button disabled={busy} onClick={enableBuzzers} className="text-xs text-primary hover:underline">
              Re-enable buzzers
            </button>
          )}
          <button disabled={busy} onClick={clearBuzzers} className="text-xs text-muted hover:text-foreground">
            Clear
          </button>
        </div>
      </div>

      {!hasQueue ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
          Waiting for buzzes…
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {state.buzzQueue.map((entry) => {
            const isActive = state.activeTeamId === entry.teamId;
            return (
              <li
                key={entry.teamId}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
                  isActive ? "border-primary bg-primary/10" : "border-border bg-background-card",
                  entry.status === "incorrect" && "opacity-50",
                  entry.status === "correct" && "border-success/50 bg-success/10"
                )}
              >
                <span className="w-7 text-center text-xl">{MEDALS[entry.rank - 1] ?? entry.rank}</span>
                <span className="flex-1 truncate font-medium">{entry.teamName}</span>

                {entry.status === "correct" && <span className="text-sm font-semibold text-success">✅ CORRECT</span>}
                {entry.status === "incorrect" && <span className="text-sm font-semibold text-danger">❌ INCORRECT</span>}

                {entry.status === "active" && isActive && (
                  <div className="flex gap-2">
                    <button
                      disabled={busy}
                      onClick={() => markAnswer(entry.teamId, "correct")}
                      className="rounded-lg bg-success/20 px-3 py-1.5 text-sm font-semibold text-success hover:bg-success/30"
                    >
                      ✅ Correct
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => markAnswer(entry.teamId, "incorrect")}
                      className="rounded-lg bg-danger/20 px-3 py-1.5 text-sm font-semibold text-danger hover:bg-danger/30"
                    >
                      ❌ Incorrect
                    </button>
                  </div>
                )}

                {entry.status === "active" && !isActive && (
                  <button
                    disabled={busy}
                    onClick={() => selectTeam(entry.teamId)}
                    className="rounded-lg bg-white/5 px-3 py-1.5 text-sm font-medium hover:bg-white/10"
                  >
                    Select
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {state.status === "scoring" && !state.buzzQueue.some((e) => e.status === "active") && (
        <p className="mt-3 text-center text-sm text-muted">No teams left to try — reveal the answer when ready.</p>
      )}

      <TeamScoreQuickList sessionId={sessionId} state={state} />
    </div>
  );
}

function TeamScoreQuickList({ sessionId, state }: { sessionId: string; state: SessionPublicState }) {
  const { call, pending } = useSessionAction(sessionId);

  return (
    <details className="mt-5 rounded-xl border border-border">
      <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-medium text-muted hover:text-foreground">
        Manual scoring
      </summary>
      <div className="flex flex-col gap-3 border-t border-border p-4">
        {state.teams.map((team) => (
          <TeamScoreRow key={team.id} teamName={team.name} score={team.score} onApply={(delta) => call("/score", { teamId: team.id, delta })} disabled={pending !== null} />
        ))}
        <div className="flex justify-end">
          <button
            disabled={pending !== null}
            onClick={() => call("/score/undo")}
            className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium hover:bg-white/10"
          >
            ↺ Undo last score change
          </button>
        </div>
      </div>
    </details>
  );
}

function TeamScoreRow({
  teamName,
  score,
  onApply,
  disabled,
}: {
  teamName: string;
  score: number;
  onApply: (delta: number) => void;
  disabled: boolean;
}) {
  const [customAmount, setCustomAmount] = useState("");

  function applyCustom(sign: 1 | -1) {
    const amount = Number(customAmount);
    if (!customAmount || !Number.isFinite(amount) || amount <= 0) return;
    onApply(sign * amount);
    setCustomAmount("");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-28 truncate text-sm">{teamName}</span>
      <span className="w-16 text-right text-sm tabular-nums text-muted">{formatScore(score)}</span>
      <div className="flex flex-1 flex-wrap justify-end gap-1">
        {[100, 200, 500].map((amount) => (
          <button
            key={`plus-${amount}`}
            disabled={disabled}
            onClick={() => onApply(amount)}
            className="rounded bg-success/15 px-2 py-1 text-xs font-medium text-success hover:bg-success/25"
          >
            +{amount}
          </button>
        ))}
        {[100, 200, 500].map((amount) => (
          <button
            key={`minus-${amount}`}
            disabled={disabled}
            onClick={() => onApply(-amount)}
            className="rounded bg-danger/15 px-2 py-1 text-xs font-medium text-danger hover:bg-danger/25"
          >
            −{amount}
          </button>
        ))}
        <input
          type="number"
          min={0}
          placeholder="Custom"
          value={customAmount}
          onChange={(e) => setCustomAmount(e.target.value)}
          className="h-6 w-20 rounded border border-border bg-background px-1.5 text-xs tabular-nums"
        />
        <button
          disabled={disabled || !customAmount}
          onClick={() => applyCustom(1)}
          className="rounded bg-success/15 px-2 py-1 text-xs font-medium text-success hover:bg-success/25 disabled:opacity-40"
        >
          +
        </button>
        <button
          disabled={disabled || !customAmount}
          onClick={() => applyCustom(-1)}
          className="rounded bg-danger/15 px-2 py-1 text-xs font-medium text-danger hover:bg-danger/25 disabled:opacity-40"
        >
          −
        </button>
      </div>
    </div>
  );
}
