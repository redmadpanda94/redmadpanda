"use client";

export interface TeamSession {
  teamId: string;
  token: string;
  teamName: string;
}

function key(sessionId: string) {
  return `quiznight.team.${sessionId}`;
}

export function saveTeamSession(sessionId: string, team: TeamSession) {
  try {
    localStorage.setItem(key(sessionId), JSON.stringify(team));
  } catch {
    // localStorage unavailable (private mode) -- team will need to rejoin.
  }
}

export function loadTeamSession(sessionId: string): TeamSession | null {
  try {
    const raw = localStorage.getItem(key(sessionId));
    if (!raw) return null;
    return JSON.parse(raw) as TeamSession;
  } catch {
    return null;
  }
}

export function clearTeamSession(sessionId: string) {
  try {
    localStorage.removeItem(key(sessionId));
  } catch {
    // ignore
  }
}
