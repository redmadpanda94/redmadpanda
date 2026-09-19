"use client";

import { useState } from "react";
import { useQuestionDetail } from "@/lib/realtime/use-question-detail";
import { useFinalWagers } from "@/lib/realtime/use-final-wagers";
import { useSessionAction } from "./session-actions";
import { MediaGroup } from "./media-group";
import { Scoreboard } from "./scoreboard";
import { formatScore } from "@/lib/utils";
import type { SessionPublicState } from "@/lib/game/session-types";

export function HostFinalQuestion({ sessionId, state }: { sessionId: string; state: SessionPublicState }) {
  const { detail } = useQuestionDetail(state.currentQuestion?.id);
  const wagers = useFinalWagers(state.currentQuestion?.id);
  const { call, pending } = useSessionAction(sessionId);
  const [revealed, setRevealed] = useState(false);
  const [resolved, setResolved] = useState<Record<string, boolean>>({});
  const cq = state.currentQuestion;

  if (!cq || !detail) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted">Loading Final Question…</p>
      </div>
    );
  }

  const answerRevealed = state.status === "answer";
  const wagersByTeam = new Map(wagers.map((w) => [w.team_id, w]));

  async function revealAnswer() {
    await call("/reveal-answer");
  }
  async function resolve(teamId: string, correct: boolean) {
    await call("/final/resolve", { teamId, correct });
    setResolved((prev) => ({ ...prev, [teamId]: true }));
  }
  async function finish() {
    await call("/finish");
  }

  return (
    <div className="flex flex-1 flex-col">
      <Scoreboard teams={state.teams} />
      <div className="flex flex-1 flex-col items-center gap-6 overflow-y-auto px-4 py-8">
        <div className="text-center">
          <p className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-accent">🏆 Final Question</p>
          <h1 className="mt-1 font-display text-3xl font-bold">{cq.categoryName}</h1>
        </div>

        <div className="w-full max-w-md rounded-xl border border-border bg-background-card p-4">
          <p className="mb-2 text-center text-xs uppercase tracking-wide text-muted">Wagers</p>
          <ul className="flex flex-col gap-1.5">
            {state.teams.map((team) => (
              <li key={team.id} className="flex items-center justify-between text-sm">
                <span>{team.name}</span>
                <span className={wagersByTeam.has(team.id) ? "text-success" : "text-muted"}>
                  {wagersByTeam.has(team.id) ? `✓ Wagered ${formatScore(wagersByTeam.get(team.id)!.amount)}` : "Waiting…"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="rounded-xl bg-primary px-6 py-3 font-display text-lg font-semibold text-white hover:bg-primary-hover"
          >
            Reveal Question
          </button>
        ) : (
          <>
            {detail.media.length > 0 && <MediaGroup media={detail.media} autoplay={state.settings.mediaAutoplay} />}
            <h2 className="max-w-2xl text-balance text-center font-display text-2xl font-bold">{detail.question.question_text}</h2>

            {answerRevealed ? (
              <div className="w-full max-w-2xl rounded-2xl border border-accent/40 bg-accent/10 p-6 text-center">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent">Answer</p>
                <p className="font-display text-2xl font-bold">{detail.question.answer_text}</p>
              </div>
            ) : (
              <button
                onClick={revealAnswer}
                disabled={pending !== null}
                className="rounded-xl bg-accent px-6 py-3 font-display text-lg font-semibold text-black hover:brightness-110"
              >
                👁 Reveal Answer
              </button>
            )}

            {answerRevealed && (
              <div className="w-full max-w-xl">
                <p className="mb-2 text-center text-xs uppercase tracking-wide text-muted">Resolve each team</p>
                <ul className="flex flex-col gap-2">
                  {state.teams.map((team) => {
                    const wager = wagersByTeam.get(team.id);
                    return (
                      <li key={team.id} className="flex items-center justify-between rounded-xl border border-border bg-background-card px-4 py-2.5">
                        <div>
                          <p className="font-medium">{team.name}</p>
                          <p className="text-xs text-muted">Wager: {formatScore(wager?.amount ?? 0)}</p>
                        </div>
                        {resolved[team.id] ? (
                          <span className="text-sm text-success">Scored</span>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              disabled={pending !== null}
                              onClick={() => resolve(team.id, true)}
                              className="rounded-lg bg-success/20 px-3 py-1.5 text-sm font-semibold text-success hover:bg-success/30"
                            >
                              ✅ Correct
                            </button>
                            <button
                              disabled={pending !== null}
                              onClick={() => resolve(team.id, false)}
                              className="rounded-lg bg-danger/20 px-3 py-1.5 text-sm font-semibold text-danger hover:bg-danger/30"
                            >
                              ❌ Incorrect
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={finish}
                    disabled={pending !== null}
                    className="rounded-xl bg-primary px-6 py-3 font-display font-semibold text-white hover:bg-primary-hover"
                  >
                    Show Final Scoreboard →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
