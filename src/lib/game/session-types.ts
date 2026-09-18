import type { BuzzStatus, GameSettings, MediaPlacement, QuestionStatus, SessionStatus } from "@/types/database";

/**
 * Shape broadcast to BOTH host and team clients over the public Realtime
 * channel. This is the redaction boundary: question_text / answer_text /
 * host notes must never appear here (spec section 68). The host UI fetches
 * that detail separately via an authenticated, RLS-scoped Supabase query.
 */
export interface PublicTeam {
  id: string;
  name: string;
  score: number;
  connected: boolean;
}

export interface PublicBuzzEntry {
  teamId: string;
  teamName: string;
  sequence: number;
  rank: number;
  status: BuzzStatus;
}

export interface PublicCurrentQuestion {
  id: string;
  categoryId: string;
  categoryName: string;
  points: number;
  status: QuestionStatus;
  mediaPlacement: MediaPlacement;
  isFinal: boolean;
  answerRevealed: boolean;
  hasMedia: boolean;
}

export interface PublicFinalWagerInfo {
  teamId: string;
  submitted: boolean;
}

export interface PublicBoardCell {
  id: string;
  points: number;
  status: QuestionStatus;
  isFinal: boolean;
}

export interface PublicBoardCategory {
  id: string;
  name: string;
  cells: PublicBoardCell[];
}

export interface SessionPublicState {
  sessionId: string;
  status: SessionStatus;
  title: string;
  joinCode: string;
  settings: GameSettings;
  buzzersOpen: boolean;
  activeTeamId: string | null;
  currentQuestion: PublicCurrentQuestion | null;
  board: PublicBoardCategory[];
  teams: PublicTeam[];
  buzzQueue: PublicBuzzEntry[];
  timerSeconds: number | null;
  timerStartedAt: string | null;
  finalWagers: PublicFinalWagerInfo[];
  updatedAt: string;
}

// NOTE: no event here ever carries question_text/answer_text. The host
// already has that data from its own authenticated, RLS-scoped fetch of
// session_questions -- these events only ever signal *that* something
// changed, never the sensitive content itself (spec section 68).
export type SessionRealtimeEvent =
  | { event: "state"; payload: SessionPublicState }
  | { event: "team_joined"; payload: { teamId: string; teamName: string } }
  | { event: "sound"; payload: { cue: SoundCue } };

export type SoundCue =
  | "question_selected"
  | "reveal"
  | "buzzer_enabled"
  | "first_buzz"
  | "correct"
  | "incorrect"
  | "countdown"
  | "time_expired"
  | "final_question";
