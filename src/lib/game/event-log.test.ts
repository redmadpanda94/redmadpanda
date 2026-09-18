import { describe, expect, it } from "vitest";
import { formatEventLine } from "./event-log";

const teamNames = new Map([
  ["t1", "Team Alpha"],
  ["t2", "Team Bravo"],
]);

describe("formatEventLine", () => {
  it("formats a join event using the payload's team name", () => {
    expect(
      formatEventLine({ type: "team_joined", payload: { teamId: "t1", teamName: "Team Alpha" }, createdAt: "" }, teamNames)
    ).toBe("Team Alpha joined");
  });

  it("formats the first buzz distinctly from later buzzes", () => {
    expect(
      formatEventLine({ type: "team_buzzed", payload: { teamId: "t1", teamName: "Team Alpha", sequence: 1 }, createdAt: "" }, teamNames)
    ).toBe("Team Alpha buzzed first");
    expect(
      formatEventLine({ type: "team_buzzed", payload: { teamId: "t2", teamName: "Team Bravo", sequence: 2 }, createdAt: "" }, teamNames)
    ).toBe("Team Bravo buzzed");
  });

  it("formats correct/incorrect with signed deltas", () => {
    expect(formatEventLine({ type: "answer_correct", payload: { teamId: "t1", delta: 300 }, createdAt: "" }, teamNames)).toBe(
      "Team Alpha correct (+300)"
    );
    expect(formatEventLine({ type: "answer_incorrect", payload: { teamId: "t1", delta: -300 }, createdAt: "" }, teamNames)).toBe(
      "Team Alpha incorrect (-300)"
    );
  });

  it("looks up team names for events that only carry a teamId", () => {
    expect(formatEventLine({ type: "team_selected", payload: { teamId: "t2" }, createdAt: "" }, teamNames)).toBe(
      "Team Bravo selected to answer"
    );
  });

  it("falls back gracefully when a team is no longer known", () => {
    expect(formatEventLine({ type: "team_selected", payload: { teamId: "unknown" }, createdAt: "" }, teamNames)).toBe(
      "A team selected to answer"
    );
  });

  it("formats session lifecycle events without a team", () => {
    expect(formatEventLine({ type: "game_started", payload: {}, createdAt: "" }, teamNames)).toBe("Game started");
    expect(formatEventLine({ type: "session_reset", payload: {}, createdAt: "" }, teamNames)).toBe("Session reset");
  });

  it("falls back to a readable version of unknown event types", () => {
    expect(formatEventLine({ type: "something_new", payload: {}, createdAt: "" }, teamNames)).toBe("something new");
  });
});
