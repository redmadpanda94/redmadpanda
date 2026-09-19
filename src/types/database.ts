// Hand-written types mirroring supabase/migrations/0001_init.sql.
// Keep in sync with the SQL schema when it changes.

export type MediaType = "image" | "gif" | "youtube" | "video" | "audio";
export type MediaPlacement = "before_question" | "after_question" | "instead_of_question";
export type QuestionStatus = "available" | "selected" | "completed";
export type SessionStatus =
  | "lobby"
  | "board"
  | "question"
  | "media"
  | "answer"
  | "buzzing"
  | "answering"
  | "scoring"
  | "final_question"
  | "finished"
  | "paused";
export type BuzzStatus = "active" | "skipped" | "correct" | "incorrect";
export type ScoreReason = "correct" | "incorrect" | "manual" | "undo" | "final_question" | "reset";

export interface GameSettings {
  defaultCountdownSeconds: number | null;
  soundEffectsEnabled: boolean;
  subtractOnIncorrect: boolean;
  mediaAutoplay: boolean;
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  defaultCountdownSeconds: null,
  soundEffectsEnabled: true,
  subtractOnIncorrect: true,
  mediaAutoplay: true,
};

export interface GameRow {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  game_type: "classic" | "custom";
  settings: GameSettings;
  created_at: string;
  updated_at: string;
}

export interface CategoryRow {
  id: string;
  game_id: string;
  name: string;
  description: string | null;
  position: number;
  created_at: string;
}

export interface QuestionRow {
  id: string;
  category_id: string;
  points: number;
  question_text: string;
  answer_text: string;
  notes: string | null;
  media_placement: MediaPlacement;
  status: QuestionStatus;
  position: number;
  is_final: boolean;
  created_at: string;
}

export interface MediaRow {
  id: string;
  question_id: string;
  type: MediaType;
  url: string | null;
  storage_path: string | null;
  original_storage_path: string | null;
  youtube_id: string | null;
  youtube_start: number | null;
  youtube_end: number | null;
  youtube_audio_only: boolean;
  trim_start: number | null;
  trim_end: number | null;
  duration: number | null;
  position: number;
  created_at: string;
}

export interface GameSessionRow {
  id: string;
  game_id: string;
  host_id: string;
  title: string;
  join_code: string;
  status: SessionStatus;
  previous_status: SessionStatus | null;
  settings: GameSettings;
  current_session_question_id: string | null;
  buzzers_open: boolean;
  buzzers_opened_at: string | null;
  active_team_id: string | null;
  timer_seconds: number | null;
  timer_started_at: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface SessionCategoryRow {
  id: string;
  session_id: string;
  source_category_id: string | null;
  name: string;
  position: number;
}

export interface SessionQuestionRow {
  id: string;
  session_id: string;
  session_category_id: string;
  source_question_id: string | null;
  points: number;
  question_text: string;
  answer_text: string;
  notes: string | null;
  media_placement: MediaPlacement;
  status: QuestionStatus;
  position: number;
  is_final: boolean;
}

export interface SessionMediaRow {
  id: string;
  session_question_id: string;
  type: MediaType;
  url: string | null;
  storage_path: string | null;
  youtube_id: string | null;
  youtube_start: number | null;
  youtube_end: number | null;
  youtube_audio_only: boolean;
  trim_start: number | null;
  trim_end: number | null;
  duration: number | null;
  position: number;
}

export interface TeamRow {
  id: string;
  session_id: string;
  name: string;
  color: string | null;
  score: number;
  secret_hash: string;
  connected: boolean;
  last_seen_at: string;
  created_at: string;
}

export interface BuzzEventRow {
  id: string;
  sequence: number;
  session_id: string;
  session_question_id: string;
  team_id: string;
  status: BuzzStatus;
  server_time: string;
  client_latency_ms: number | null;
}

export interface ScoreEventRow {
  id: string;
  session_id: string;
  team_id: string;
  session_question_id: string | null;
  delta: number;
  resulting_score: number;
  reason: ScoreReason;
  note: string | null;
  undone: boolean;
  created_at: string;
}

export interface FinalWagerRow {
  id: string;
  session_id: string;
  session_question_id: string;
  team_id: string;
  amount: number;
  locked: boolean;
  correct: boolean | null;
  created_at: string;
}

export interface GameEventRow {
  id: string;
  session_id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
}
