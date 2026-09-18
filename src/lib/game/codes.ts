import { customAlphabet } from "nanoid";

// Excludes ambiguous characters (0/O, 1/I/L) for codes read off a TV screen.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const generate = customAlphabet(ALPHABET, 6);

export function generateJoinCode(): string {
  return generate();
}

export function normalizeJoinCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}
