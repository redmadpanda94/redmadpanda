"use client";

import { useQuestionDetail } from "@/lib/realtime/use-question-detail";
import { useSessionAction } from "./session-actions";
import { MediaGroup } from "./media-group";
import { BuzzerPanel } from "./buzzer-panel";
import { TimerControl } from "./timer-control";
import { Scoreboard } from "./scoreboard";
import type { SessionPublicState } from "@/lib/game/session-types";

export function HostQuestion({ sessionId, state }: { sessionId: string; state: SessionPublicState }) {
  const { detail } = useQuestionDetail(state.currentQuestion?.id);
  const { call, pending } = useSessionAction(sessionId);
  const cq = state.currentQuestion;

  if (!cq || !detail) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted">Loading question…</p>
      </div>
    );
  }

  const { question, media } = detail;
  const answerRevealed = state.status === "answer";
  const showMediaNow = state.status === "media" || cq.mediaPlacement === "before_question" || cq.mediaPlacement === "instead_of_question";
  // "Instead of question" has no separate reveal step (media shows immediately,
  // see showMediaNow above), so the question text should just never appear.
  const showQuestionText = cq.mediaPlacement !== "instead_of_question";

  async function revealAnswer() {
    await call("/reveal-answer");
  }
  async function closeQuestion() {
    await call("/close-question");
  }
  async function showMedia() {
    await call("/show-media");
  }

  return (
    <div className="flex flex-1 flex-col">
      <Scoreboard teams={state.teams} />

      <div className="flex flex-1 flex-col items-center gap-6 overflow-y-auto px-4 py-6">
        <div className="flex items-center gap-3 text-sm text-muted">
          <span className="rounded-full bg-white/5 px-3 py-1 uppercase tracking-wide">{cq.categoryName}</span>
          <span className="font-display text-xl font-bold text-accent">{cq.points}</span>
          {state.timerSeconds !== null && <TimerControl sessionId={sessionId} seconds={state.timerSeconds} startedAt={state.timerStartedAt} />}
        </div>

        {showMediaNow && media.length > 0 && <MediaGroup media={media} autoplay={state.settings.mediaAutoplay} />}

        {showQuestionText && (
          <h1 className="max-w-3xl text-balance text-center font-display text-3xl font-bold leading-tight sm:text-4xl animate-reveal">
            {question.question_text || <span className="text-muted">(No question text)</span>}
          </h1>
        )}

        {cq.mediaPlacement === "after_question" && !showMediaNow && media.length > 0 && state.status !== "question" && (
          <MediaGroup media={media} autoplay={state.settings.mediaAutoplay} />
        )}

        {answerRevealed && (
          <div className="w-full max-w-2xl rounded-2xl border border-accent/40 bg-accent/10 p-6 text-center animate-reveal">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent">Answer</p>
            <p className="font-display text-2xl font-bold">{question.answer_text || "(No answer text)"}</p>
          </div>
        )}

        {question.notes && (
          <p className="max-w-xl rounded-lg bg-white/5 px-4 py-2 text-center text-xs text-muted">📝 {question.notes}</p>
        )}

        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {cq.mediaPlacement === "after_question" && media.length > 0 && state.status === "question" && (
            <ActionButton onClick={showMedia} disabled={pending !== null}>
              ▶ Play Media
            </ActionButton>
          )}
          {!answerRevealed && (
            <ActionButton onClick={revealAnswer} disabled={pending !== null} variant="accent">
              👁 Reveal Answer
            </ActionButton>
          )}
          <ActionButton onClick={closeQuestion} disabled={pending !== null} variant={answerRevealed ? "primary" : "secondary"}>
            ✓ Close Question
          </ActionButton>
        </div>

        <BuzzerPanel sessionId={sessionId} state={state} />
      </div>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  variant = "secondary",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "accent";
}) {
  const styles = {
    primary: "bg-primary text-white hover:bg-primary-hover",
    secondary: "bg-white/5 text-foreground hover:bg-white/10",
    accent: "bg-accent text-black hover:brightness-110",
  }[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${styles}`}
    >
      {children}
    </button>
  );
}
