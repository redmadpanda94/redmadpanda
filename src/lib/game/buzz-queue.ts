import type { BuzzStatus } from "@/types/database";

/**
 * Pure buzz-queue logic shared by the host panel and the API routes.
 * Ordering authority is the database `sequence` bigserial column (assigned
 * atomically at insert time) — never client timestamps. See
 * api/sessions/[id]/buzz/route.ts for the atomic insert.
 */
export interface BuzzEntry {
  id: string;
  teamId: string;
  sequence: number;
  status: BuzzStatus;
}

export interface RankedBuzzEntry extends BuzzEntry {
  /** 1-based position in buzz order (medal position), independent of status. */
  rank: number;
}

/** Sort buzz entries by server-assigned sequence and attach a 1-based rank. */
export function rankBuzzEntries(entries: BuzzEntry[]): RankedBuzzEntry[] {
  return [...entries]
    .sort((a, b) => a.sequence - b.sequence)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

/**
 * The next team eligible to answer: the lowest-sequence entry still
 * "active" (i.e. not yet marked correct/incorrect and not skipped).
 */
export function getNextAvailableEntry(entries: BuzzEntry[]): RankedBuzzEntry | null {
  const ranked = rankBuzzEntries(entries);
  return ranked.find((entry) => entry.status === "active") ?? null;
}

/** All remaining (not yet resolved) entries, in order. */
export function getActiveQueue(entries: BuzzEntry[]): RankedBuzzEntry[] {
  return rankBuzzEntries(entries).filter((entry) => entry.status === "active");
}

/** True once every team that buzzed has been marked correct/incorrect/skipped. */
export function isQueueExhausted(entries: BuzzEntry[]): boolean {
  return entries.length > 0 && getActiveQueue(entries).length === 0;
}

export function hasTeamBuzzed(entries: BuzzEntry[], teamId: string): boolean {
  return entries.some((entry) => entry.teamId === teamId);
}

/**
 * Whether a fresh buzz attempt from `teamId` should be accepted. Mirrors the
 * server-side checks in the buzz API route; used for optimistic client UI
 * and unit tests. The database unique index (session_question_id, team_id)
 * is the real source of truth for de-duplication under concurrency.
 */
export function canAcceptBuzz(params: {
  buzzersOpen: boolean;
  sessionStatus: string;
  entries: BuzzEntry[];
  teamId: string;
}): { ok: true } | { ok: false; reason: string } {
  const { buzzersOpen, sessionStatus, entries, teamId } = params;
  if (!buzzersOpen) return { ok: false, reason: "Buzzers are currently disabled." };
  if (sessionStatus !== "buzzing") return { ok: false, reason: "Buzzers are currently disabled." };
  if (hasTeamBuzzed(entries, teamId)) return { ok: false, reason: "You already buzzed for this question." };
  return { ok: true };
}
