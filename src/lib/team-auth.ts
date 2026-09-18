import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Teams have no accounts (spec section 69). On join, the server mints a
 * random opaque token, returns it once to the client (stored in
 * localStorage), and persists only an HMAC of it. Every subsequent team
 * request must present {teamId, token}; we re-hash and compare.
 */

function getSecret(): string {
  const secret = process.env.TEAM_TOKEN_SECRET;
  if (!secret) throw new Error("Missing TEAM_TOKEN_SECRET environment variable");
  return secret;
}

export function generateTeamToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashTeamToken(token: string): string {
  return createHmac("sha256", getSecret()).update(token).digest("hex");
}

export function verifyTeamToken(token: string, storedHash: string): boolean {
  const computed = Buffer.from(hashTeamToken(token), "hex");
  const stored = Buffer.from(storedHash, "hex");
  if (computed.length !== stored.length) return false;
  return timingSafeEqual(computed, stored);
}
