import { describe, expect, it } from "vitest";
import {
  canAcceptBuzz,
  getActiveQueue,
  getNextAvailableEntry,
  hasTeamBuzzed,
  isQueueExhausted,
  rankBuzzEntries,
  type BuzzEntry,
} from "./buzz-queue";

function entry(partial: Partial<BuzzEntry> & Pick<BuzzEntry, "id" | "teamId" | "sequence">): BuzzEntry {
  return { status: "active", ...partial };
}

describe("rankBuzzEntries", () => {
  it("orders strictly by server sequence, not insertion order", () => {
    const entries = [
      entry({ id: "b", teamId: "team-b", sequence: 5 }),
      entry({ id: "a", teamId: "team-a", sequence: 2 }),
      entry({ id: "c", teamId: "team-c", sequence: 9 }),
    ];
    const ranked = rankBuzzEntries(entries);
    expect(ranked.map((r) => r.teamId)).toEqual(["team-a", "team-b", "team-c"]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("never produces duplicate ranks even for equal sequence numbers (defensive)", () => {
    const entries = [
      entry({ id: "a", teamId: "team-a", sequence: 1 }),
      entry({ id: "b", teamId: "team-b", sequence: 1 }),
    ];
    const ranked = rankBuzzEntries(entries);
    expect(new Set(ranked.map((r) => r.rank)).size).toBe(2);
  });
});

describe("incorrect-answer progression (spec section 19)", () => {
  it("walks through the full buzz queue as each team answers incorrectly", () => {
    const entries: BuzzEntry[] = [
      entry({ id: "1", teamId: "alpha", sequence: 1 }),
      entry({ id: "2", teamId: "charlie", sequence: 2 }),
      entry({ id: "3", teamId: "bravo", sequence: 3 }),
      entry({ id: "4", teamId: "delta", sequence: 4 }),
    ];

    expect(getNextAvailableEntry(entries)?.teamId).toBe("alpha");

    // Alpha answers incorrectly.
    entries[0] = { ...entries[0], status: "incorrect" };
    expect(getNextAvailableEntry(entries)?.teamId).toBe("charlie");
    expect(isQueueExhausted(entries)).toBe(false);

    // Charlie answers incorrectly.
    entries[1] = { ...entries[1], status: "incorrect" };
    expect(getNextAvailableEntry(entries)?.teamId).toBe("bravo");

    // Bravo answers correctly -> host stops progressing, queue still has delta left
    // but the question is done, so callers won't call getNextAvailableEntry again.
    entries[2] = { ...entries[2], status: "correct" };
    expect(getActiveQueue(entries).map((e) => e.teamId)).toEqual(["delta"]);
    expect(isQueueExhausted(entries)).toBe(false);
  });

  it("reports the queue as exhausted only once every team has been resolved", () => {
    const entries: BuzzEntry[] = [
      entry({ id: "1", teamId: "alpha", sequence: 1, status: "incorrect" }),
      entry({ id: "2", teamId: "bravo", sequence: 2, status: "incorrect" }),
    ];
    expect(isQueueExhausted(entries)).toBe(true);
    expect(getNextAvailableEntry(entries)).toBeNull();
  });

  it("an empty queue is not considered exhausted (nobody has buzzed yet)", () => {
    expect(isQueueExhausted([])).toBe(false);
  });

  it("host can skip ahead to any remaining team out of order (manual select)", () => {
    // getActiveQueue exposes every eligible team, not just the head, so the
    // host UI can render [SELECT TEAM X] buttons for all of them.
    const entries: BuzzEntry[] = [
      entry({ id: "1", teamId: "alpha", sequence: 1 }),
      entry({ id: "2", teamId: "charlie", sequence: 2 }),
      entry({ id: "3", teamId: "bravo", sequence: 3 }),
    ];
    const active = getActiveQueue(entries);
    expect(active.map((e) => e.teamId)).toContain("bravo");
  });
});

describe("canAcceptBuzz / duplicate buzz prevention", () => {
  const baseEntries: BuzzEntry[] = [entry({ id: "1", teamId: "alpha", sequence: 1 })];

  it("rejects a second buzz from the same team for the same question", () => {
    const result = canAcceptBuzz({
      buzzersOpen: true,
      sessionStatus: "buzzing",
      entries: baseEntries,
      teamId: "alpha",
    });
    expect(result.ok).toBe(false);
  });

  it("accepts a first buzz from a fresh team while buzzers are open", () => {
    const result = canAcceptBuzz({
      buzzersOpen: true,
      sessionStatus: "buzzing",
      entries: baseEntries,
      teamId: "bravo",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects any buzz while buzzers are disabled", () => {
    const result = canAcceptBuzz({
      buzzersOpen: false,
      sessionStatus: "question",
      entries: [],
      teamId: "bravo",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a buzz if the session status is not 'buzzing' even if the flag lags", () => {
    const result = canAcceptBuzz({
      buzzersOpen: true,
      sessionStatus: "scoring",
      entries: [],
      teamId: "bravo",
    });
    expect(result.ok).toBe(false);
  });

  it("hasTeamBuzzed is a simple membership check", () => {
    expect(hasTeamBuzzed(baseEntries, "alpha")).toBe(true);
    expect(hasTeamBuzzed(baseEntries, "zulu")).toBe(false);
  });
});
