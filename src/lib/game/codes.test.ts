import { describe, expect, it } from "vitest";
import { generateJoinCode, normalizeJoinCode } from "./codes";

describe("generateJoinCode", () => {
  it("generates a 6-character uppercase code", () => {
    const code = generateJoinCode();
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });

  it("avoids ambiguous characters (0, O, 1, I, L)", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateJoinCode();
      expect(code).not.toMatch(/[01ILO]/);
    }
  });

  it("generates unique codes with very high probability", () => {
    const codes = new Set(Array.from({ length: 500 }, () => generateJoinCode()));
    expect(codes.size).toBe(500);
  });
});

describe("normalizeJoinCode", () => {
  it("uppercases and trims", () => {
    expect(normalizeJoinCode(" abcd12 ")).toBe("ABCD12");
  });

  it("strips non-alphanumeric characters (e.g. from a pasted URL fragment)", () => {
    expect(normalizeJoinCode("ab-cd 12!")).toBe("ABCD12");
  });
});
