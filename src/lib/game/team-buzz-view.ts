import type { SessionPublicState } from "./session-types";

export type TeamBuzzView =
  | { kind: "waiting"; message: string }
  | { kind: "ready_to_buzz" }
  | { kind: "buzzed"; rank: number }
  | { kind: "you_may_answer" }
  | { kind: "other_answering"; teamName: string }
  | { kind: "correct" }
  | { kind: "incorrect" }
  | { kind: "locked" };

/**
 * Pure derivation of "what should this team's phone show right now" from
 * the public session state (spec sections 16-20, 36, 67). Kept separate
 * from the component so the state machine can be unit tested without a
 * browser/DOM.
 */
export function deriveTeamBuzzView(state: SessionPublicState, myTeamId: string): TeamBuzzView {
  const myEntry = state.buzzQueue.find((e) => e.teamId === myTeamId);

  if (state.status === "lobby") return { kind: "waiting", message: "Waiting for the host to start the game…" };
  if (state.status === "board") return { kind: "waiting", message: "Get ready — the host is choosing a question." };
  if (state.status === "finished") return { kind: "waiting", message: "Game over — thanks for playing!" };

  if (myEntry?.status === "correct") return { kind: "correct" };
  if (myEntry?.status === "incorrect") return { kind: "incorrect" };

  if (state.activeTeamId === myTeamId) return { kind: "you_may_answer" };
  if (state.activeTeamId && state.activeTeamId !== myTeamId) {
    const activeTeam = state.teams.find((t) => t.id === state.activeTeamId);
    return { kind: "other_answering", teamName: activeTeam?.name ?? "Another team" };
  }

  if (myEntry?.status === "active") return { kind: "buzzed", rank: myEntry.rank };

  if (state.buzzersOpen) return { kind: "ready_to_buzz" };

  if (state.status === "answer" || state.status === "scoring") {
    return { kind: "waiting", message: "Buzzers closed." };
  }

  return { kind: "locked" };
}
