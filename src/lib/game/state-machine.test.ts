import { describe, expect, it } from "vitest";
import { canTransition, isLiveState } from "./state-machine";

describe("session state machine", () => {
  it("allows the normal game flow", () => {
    expect(canTransition("lobby", "board")).toBe(true);
    expect(canTransition("board", "question")).toBe(true);
    expect(canTransition("question", "buzzing")).toBe(true);
    expect(canTransition("buzzing", "answering")).toBe(true);
    expect(canTransition("answering", "scoring")).toBe(true);
    expect(canTransition("scoring", "answer")).toBe(true);
    expect(canTransition("answer", "board")).toBe(true);
    expect(canTransition("board", "final_question")).toBe(true);
    expect(canTransition("final_question", "finished")).toBe(true);
  });

  it("allows skipping buzzing entirely for a non-buzzer question", () => {
    expect(canTransition("question", "answer")).toBe(true);
  });

  it("allows the incorrect-answer loop back to buzzing", () => {
    expect(canTransition("answering", "buzzing")).toBe(true);
  });

  it("rejects transitions out of finished", () => {
    expect(canTransition("finished", "board")).toBe(false);
    expect(canTransition("finished", "lobby")).toBe(false);
  });

  it("rejects skipping straight from lobby to question", () => {
    expect(canTransition("lobby", "question")).toBe(false);
  });

  it("allows pausing from any live state and resuming back into a live state", () => {
    expect(canTransition("buzzing", "paused")).toBe(true);
    expect(canTransition("paused", "buzzing")).toBe(true);
    expect(canTransition("paused", "answering")).toBe(true);
  });

  it("treats same-state transitions as no-ops that are always allowed", () => {
    expect(canTransition("board", "board")).toBe(true);
  });

  it("classifies live vs terminal/lobby states", () => {
    expect(isLiveState("buzzing")).toBe(true);
    expect(isLiveState("lobby")).toBe(false);
    expect(isLiveState("finished")).toBe(false);
  });
});
