export interface EventLogEntry {
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

/**
 * Formats a raw game_events row into a human-readable history line (spec
 * section 61), e.g. "Team Alpha buzzed first" / "Team Charlie correct +300".
 * Pure function so the formatting logic is unit-testable without a DB.
 */
export function formatEventLine(entry: EventLogEntry, teamNameById: Map<string, string>): string {
  const name = (teamId: unknown) => (typeof teamId === "string" ? teamNameById.get(teamId) ?? "A team" : "A team");
  const p = entry.payload;

  switch (entry.type) {
    case "team_joined":
      return `${p.teamName ?? name(p.teamId)} joined`;
    case "question_selected":
      return `Question selected (${p.points} points)`;
    case "show_media":
      return "Media shown";
    case "buzzers_enabled":
      return "Buzzers enabled";
    case "buzzers_disabled":
      return "Buzzers disabled";
    case "buzz_queue_cleared":
      return "Buzz queue cleared";
    case "team_buzzed": {
      const seq = typeof p.sequence === "number" ? p.sequence : null;
      return `${p.teamName ?? name(p.teamId)} buzzed${seq === 1 ? " first" : ""}`;
    }
    case "team_selected":
      return `${name(p.teamId)} selected to answer`;
    case "answer_correct":
      return `${name(p.teamId)} correct (+${p.delta})`;
    case "answer_incorrect":
      return `${name(p.teamId)} incorrect (${p.delta})`;
    case "answer_revealed":
      return "Answer revealed";
    case "manual_score":
      return `${name(p.teamId)} manually adjusted (${Number(p.delta) > 0 ? "+" : ""}${p.delta})${p.note ? ` — ${p.note}` : ""}`;
    case "score_set":
      return `${name(p.teamId)} score set to ${p.score}`;
    case "score_undone":
      return `Undid last score change for ${name(p.teamId)} (${p.delta})`;
    case "question_closed":
      return "Question closed";
    case "game_started":
      return "Game started";
    case "game_paused":
      return "Game paused";
    case "game_resumed":
      return "Game resumed";
    case "game_finished":
      return "Game finished";
    case "session_reset":
      return "Session reset";
    case "final_wager_submitted":
      return `${name(p.teamId)} submitted a Final Question wager`;
    case "final_resolved":
      return `${name(p.teamId)} ${p.correct ? "correct" : "incorrect"} on Final Question (wager ${p.amount})`;
    default:
      return entry.type.replace(/_/g, " ");
  }
}
