import { describe, expect, it } from "vitest";
import {
  applyDelta,
  clampFinalWager,
  computeAnswerDelta,
  computeFinalWagerDelta,
} from "./scoring";

describe("computeAnswerDelta", () => {
  it("awards the full point value on correct, regardless of the penalty setting", () => {
    expect(computeAnswerDelta(300, "correct", { incorrectPenalty: "full" })).toBe(300);
    expect(computeAnswerDelta(300, "correct", { incorrectPenalty: "half" })).toBe(300);
    expect(computeAnswerDelta(300, "correct", { incorrectPenalty: "none" })).toBe(300);
  });

  it("subtracts the full point value on incorrect when the penalty is 'full'", () => {
    expect(computeAnswerDelta(300, "incorrect", { incorrectPenalty: "full" })).toBe(-300);
  });

  it("subtracts half the point value on incorrect when the penalty is 'half'", () => {
    expect(computeAnswerDelta(300, "incorrect", { incorrectPenalty: "half" })).toBe(-150);
  });

  it("rounds the half penalty to the nearest whole point for odd values", () => {
    expect(computeAnswerDelta(101, "incorrect", { incorrectPenalty: "half" })).toBe(-51);
  });

  it("does not change score on incorrect when the penalty is 'none'", () => {
    expect(computeAnswerDelta(300, "incorrect", { incorrectPenalty: "none" })).toBe(0);
  });
});

describe("applyDelta", () => {
  it("allows scores to go negative", () => {
    expect(applyDelta(100, -300)).toBe(-200);
  });

  it("adds positive deltas normally", () => {
    expect(applyDelta(1200, 300)).toBe(1500);
  });
});

describe("final wager", () => {
  it("clamps wagers to [0, currentScore]", () => {
    expect(clampFinalWager(500, 1000)).toBe(500);
    expect(clampFinalWager(5000, 1000)).toBe(1000);
    expect(clampFinalWager(-50, 1000)).toBe(0);
  });

  it("floors wagers at 0 even with a negative score (can still wager 0)", () => {
    expect(clampFinalWager(100, -200)).toBe(0);
  });

  it("truncates non-integer wagers", () => {
    expect(clampFinalWager(499.9, 1000)).toBe(499);
  });

  it("computes correct/incorrect wager deltas", () => {
    expect(computeFinalWagerDelta(500, true)).toBe(500);
    expect(computeFinalWagerDelta(500, false)).toBe(-500);
  });
});
