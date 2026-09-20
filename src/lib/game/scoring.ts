/**
 * Pure scoring calculations. No I/O — callers persist the resulting score
 * via a score_events insert (see api/sessions/[id]/score).
 */

export interface ScoreSettings {
  incorrectPenalty: "none" | "half" | "full";
}

/** Delta to apply when the host marks an answer correct or incorrect. */
export function computeAnswerDelta(
  pointValue: number,
  outcome: "correct" | "incorrect",
  settings: ScoreSettings
): number {
  if (outcome === "correct") return pointValue;
  switch (settings.incorrectPenalty) {
    case "full":
      return -pointValue;
    case "half":
      return -Math.round(pointValue / 2);
    case "none":
    default:
      return 0;
  }
}

/** Scores are intentionally allowed to go negative — no clamping. */
export function applyDelta(currentScore: number, delta: number): number {
  return currentScore + delta;
}

export function computeFinalWagerDelta(wager: number, correct: boolean): number {
  return correct ? wager : -wager;
}

/** Clamp a wager to the "can't wager more than you have, minimum 0" rule. */
export function clampFinalWager(requested: number, currentScore: number): number {
  const min = 0;
  const max = Math.max(currentScore, 0);
  if (!Number.isFinite(requested)) return min;
  return Math.min(Math.max(Math.trunc(requested), min), max);
}

export const QUICK_SCORE_INCREMENTS = [100, 200, 500] as const;
