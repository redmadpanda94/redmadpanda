import { describe, expect, it } from "vitest";
import { deriveTeamBuzzView } from "./team-buzz-view";
import type { SessionPublicState } from "./session-types";
import { DEFAULT_GAME_SETTINGS } from "@/types/database";

function baseState(overrides: Partial<SessionPublicState> = {}): SessionPublicState {
  return {
    sessionId: "s1",
    status: "buzzing",
    title: "Test Game",
    joinCode: "ABCD12",
    settings: DEFAULT_GAME_SETTINGS,
    buzzersOpen: true,
    activeTeamId: null,
    currentQuestion: null,
    board: [],
    teams: [
      { id: "team-a", name: "Alpha", score: 0, connected: true },
      { id: "team-b", name: "Bravo", score: 0, connected: true },
    ],
    buzzQueue: [],
    timerSeconds: null,
    timerStartedAt: null,
    finalWagers: [],
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("deriveTeamBuzzView", () => {
  it("shows waiting before the game starts", () => {
    expect(deriveTeamBuzzView(baseState({ status: "lobby" }), "team-a")).toEqual({
      kind: "waiting",
      message: expect.stringContaining("start"),
    });
  });

  it("shows ready_to_buzz when buzzers are open and the team hasn't buzzed", () => {
    expect(deriveTeamBuzzView(baseState(), "team-a")).toEqual({ kind: "ready_to_buzz" });
  });

  it("shows the team's rank once they've buzzed", () => {
    const state = baseState({
      buzzQueue: [{ teamId: "team-a", teamName: "Alpha", sequence: 1, rank: 1, status: "active" }],
    });
    expect(deriveTeamBuzzView(state, "team-a")).toEqual({ kind: "buzzed", rank: 1 });
  });

  it("tells the selected team they may answer", () => {
    const state = baseState({ activeTeamId: "team-a" });
    expect(deriveTeamBuzzView(state, "team-a")).toEqual({ kind: "you_may_answer" });
  });

  it("tells other teams who is currently answering", () => {
    const state = baseState({ activeTeamId: "team-b" });
    expect(deriveTeamBuzzView(state, "team-a")).toEqual({ kind: "other_answering", teamName: "Bravo" });
  });

  it("shows correct/incorrect once resolved, even after active team clears", () => {
    const correctState = baseState({
      buzzQueue: [{ teamId: "team-a", teamName: "Alpha", sequence: 1, rank: 1, status: "correct" }],
    });
    expect(deriveTeamBuzzView(correctState, "team-a")).toEqual({ kind: "correct" });

    const incorrectState = baseState({
      buzzQueue: [{ teamId: "team-a", teamName: "Alpha", sequence: 1, rank: 1, status: "incorrect" }],
    });
    expect(deriveTeamBuzzView(incorrectState, "team-a")).toEqual({ kind: "incorrect" });
  });

  it("shows locked when buzzers are closed and no question is active", () => {
    const state = baseState({ buzzersOpen: false, status: "question" });
    expect(deriveTeamBuzzView(state, "team-a")).toEqual({ kind: "locked" });
  });

  it("shows game over once finished", () => {
    expect(deriveTeamBuzzView(baseState({ status: "finished" }), "team-a").kind).toBe("waiting");
  });
});
