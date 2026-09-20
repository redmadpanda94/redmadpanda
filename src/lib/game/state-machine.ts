import type { SessionStatus } from "@/types/database";

/**
 * Explicit session state machine (spec section 53) instead of scattered
 * booleans. `paused` can resume into any "live" state because the host may
 * pause mid-question, mid-buzz, etc.
 */
const LIVE_STATES: SessionStatus[] = [
  "board",
  "question",
  "media",
  "buzzing",
  "answering",
  "scoring",
  "answer",
  "final_question",
];

const TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  lobby: ["board", "paused"],
  // "finished" is reachable from every live state (not just board/final
  // question) -- the host's "End game" control is an emergency-stop/early-
  // wrap-up button that must work no matter where the game currently is.
  board: ["question", "final_question", "finished", "paused"],
  question: ["media", "buzzing", "answering", "answer", "board", "finished", "paused"],
  media: ["question", "buzzing", "answering", "answer", "board", "finished", "paused"],
  buzzing: ["answering", "answer", "board", "finished", "paused"],
  answering: ["buzzing", "scoring", "answer", "board", "finished", "paused"],
  scoring: ["buzzing", "answering", "answer", "board", "finished", "paused"],
  answer: ["board", "scoring", "finished", "paused"],
  final_question: ["finished", "board", "answer", "paused"],
  finished: [],
  paused: LIVE_STATES,
};

export function canTransition(from: SessionStatus, to: SessionStatus): boolean {
  if (from === to) return true;
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: SessionStatus, to: SessionStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid session state transition: ${from} -> ${to}`);
  }
}

export function isLiveState(status: SessionStatus): boolean {
  return LIVE_STATES.includes(status);
}
