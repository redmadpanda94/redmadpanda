import { beforeAll, describe, expect, it } from "vitest";
import { generateTeamToken, hashTeamToken, verifyTeamToken } from "./team-auth";

beforeAll(() => {
  process.env.TEAM_TOKEN_SECRET = "test-secret-do-not-use-in-prod";
});

describe("team token hashing", () => {
  it("verifies a freshly generated token against its hash", () => {
    const token = generateTeamToken();
    const hash = hashTeamToken(token);
    expect(verifyTeamToken(token, hash)).toBe(true);
  });

  it("rejects a wrong token", () => {
    const hash = hashTeamToken(generateTeamToken());
    expect(verifyTeamToken(generateTeamToken(), hash)).toBe(false);
  });

  it("generates unique tokens", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateTeamToken()));
    expect(tokens.size).toBe(50);
  });

  it("rejects a hash of different length without throwing", () => {
    expect(verifyTeamToken("x", "short")).toBe(false);
  });
});
