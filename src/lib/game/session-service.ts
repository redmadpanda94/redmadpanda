import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api-helpers";
import { broadcastToSession } from "@/lib/realtime/broadcast";
import { rankBuzzEntries, type BuzzEntry } from "@/lib/game/buzz-queue";
import { applyDelta } from "@/lib/game/scoring";
import { verifyTeamToken } from "@/lib/team-auth";
import type {
  GameSessionRow,
  ScoreEventRow,
  ScoreReason,
  SessionQuestionRow,
  TeamRow,
} from "@/types/database";
import type { SessionPublicState, SessionRealtimeEvent, SoundCue } from "@/lib/game/session-types";

type Admin = SupabaseClient;

export async function getSessionOrThrow(admin: Admin, sessionId: string): Promise<GameSessionRow> {
  const { data, error } = await admin.from("game_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (error) throw new ApiError("Failed to load session.", 500);
  if (!data) throw new ApiError("This game session no longer exists.", 404);
  return data as GameSessionRow;
}

export async function requireSessionForHost(
  admin: Admin,
  sessionId: string,
  hostUserId: string
): Promise<GameSessionRow> {
  const session = await getSessionOrThrow(admin, sessionId);
  if (session.host_id !== hostUserId) throw new ApiError("You do not have access to this session.", 403);
  return session;
}

export async function requireTeam(
  admin: Admin,
  sessionId: string,
  teamId: string,
  token: string
): Promise<TeamRow> {
  const { data, error } = await admin.from("teams").select("*").eq("id", teamId).maybeSingle();
  if (error) throw new ApiError("Failed to load team.", 500);
  if (!data || data.session_id !== sessionId) throw new ApiError("This team is no longer connected.", 404);
  if (!verifyTeamToken(token, data.secret_hash)) throw new ApiError("Invalid team credentials.", 401);
  return data as TeamRow;
}

export async function logEvent(admin: Admin, sessionId: string, type: string, payload: Record<string, unknown> = {}) {
  const { error } = await admin.from("game_events").insert({ session_id: sessionId, type, payload });
  if (error) console.error("Failed to log game event", error);
}

export async function touchTeamConnection(admin: Admin, teamId: string, connected: boolean) {
  await admin.from("teams").update({ connected, last_seen_at: new Date().toISOString() }).eq("id", teamId);
}

async function fetchCurrentQuestionDetail(
  admin: Admin,
  session: GameSessionRow
): Promise<{ question: SessionQuestionRow; categoryName: string; hasMedia: boolean } | null> {
  if (!session.current_session_question_id) return null;
  const { data: question } = await admin
    .from("session_questions")
    .select("*")
    .eq("id", session.current_session_question_id)
    .maybeSingle();
  if (!question) return null;

  const [{ data: category }, { count }] = await Promise.all([
    admin.from("session_categories").select("name").eq("id", question.session_category_id).maybeSingle(),
    admin
      .from("session_media")
      .select("id", { count: "exact", head: true })
      .eq("session_question_id", question.id),
  ]);

  return {
    question: question as SessionQuestionRow,
    categoryName: category?.name ?? "",
    hasMedia: (count ?? 0) > 0,
  };
}

export async function buildPublicState(admin: Admin, sessionId: string): Promise<SessionPublicState> {
  const session = await getSessionOrThrow(admin, sessionId);

  const [{ data: teams }, currentDetail, { data: boardCategories }] = await Promise.all([
    admin.from("teams").select("*").eq("session_id", sessionId).order("created_at", { ascending: true }),
    fetchCurrentQuestionDetail(admin, session),
    admin
      .from("session_categories")
      .select("id, name, position, session_questions(id, points, status, is_final, position)")
      .eq("session_id", sessionId)
      .order("position"),
  ]);

  const board: SessionPublicState["board"] = (boardCategories ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    cells: ((c.session_questions ?? []) as { id: string; points: number; status: string; is_final: boolean; position: number }[])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((q) => ({ id: q.id, points: q.points, status: q.status as SessionPublicState["board"][number]["cells"][number]["status"], isFinal: q.is_final })),
  }));

  let buzzQueue: SessionPublicState["buzzQueue"] = [];
  let finalWagers: SessionPublicState["finalWagers"] = [];

  if (currentDetail) {
    const { data: buzzRows } = await admin
      .from("buzz_events")
      .select("*")
      .eq("session_question_id", currentDetail.question.id)
      .order("sequence", { ascending: true });

    const teamNameById = new Map((teams ?? []).map((t: TeamRow) => [t.id, t.name]));
    const entries: BuzzEntry[] = (buzzRows ?? []).map((b) => ({
      id: b.id,
      teamId: b.team_id,
      sequence: b.sequence,
      status: b.status,
    }));
    buzzQueue = rankBuzzEntries(entries).map((e) => ({
      teamId: e.teamId,
      teamName: teamNameById.get(e.teamId) ?? "Unknown team",
      sequence: e.sequence,
      rank: e.rank,
      status: e.status,
    }));

    if (currentDetail.question.is_final) {
      const { data: wagerRows } = await admin
        .from("final_wagers")
        .select("team_id")
        .eq("session_question_id", currentDetail.question.id);
      finalWagers = (wagerRows ?? []).map((w) => ({ teamId: w.team_id, submitted: true }));
    }
  }

  const state: SessionPublicState = {
    sessionId: session.id,
    status: session.status,
    title: session.title,
    joinCode: session.join_code,
    settings: session.settings,
    buzzersOpen: session.buzzers_open,
    activeTeamId: session.active_team_id,
    board,
    currentQuestion: currentDetail
      ? {
          id: currentDetail.question.id,
          categoryId: currentDetail.question.session_category_id,
          categoryName: currentDetail.categoryName,
          points: currentDetail.question.points,
          status: currentDetail.question.status,
          mediaPlacement: currentDetail.question.media_placement,
          isFinal: currentDetail.question.is_final,
          answerRevealed: session.status === "answer" || session.status === "scoring",
          hasMedia: currentDetail.hasMedia,
        }
      : null,
    teams: (teams ?? []).map((t: TeamRow) => ({
      id: t.id,
      name: t.name,
      score: t.score,
      connected: t.connected && Date.now() - new Date(t.last_seen_at).getTime() < 45_000,
    })),
    buzzQueue,
    timerSeconds: session.timer_seconds,
    timerStartedAt: session.timer_started_at,
    finalWagers,
    updatedAt: new Date().toISOString(),
  };

  return state;
}

/** Recomputes and broadcasts the public state; returns it for the caller's own response. */
export async function publishState(admin: Admin, sessionId: string): Promise<SessionPublicState> {
  const state = await buildPublicState(admin, sessionId);
  await broadcastToSession(sessionId, { event: "state", payload: state });
  return state;
}

/** Central scoring mutation -- every score change (correct/incorrect/manual/undo/final) goes through here. */
export async function applyScoreDelta(
  admin: Admin,
  params: {
    sessionId: string;
    teamId: string;
    delta: number;
    reason: ScoreReason;
    sessionQuestionId?: string | null;
    note?: string | null;
  }
): Promise<ScoreEventRow> {
  const { data: team, error: teamError } = await admin.from("teams").select("*").eq("id", params.teamId).maybeSingle();
  if (teamError) throw teamError;
  if (!team) throw new ApiError("Team not found.", 404);

  const resultingScore = applyDelta((team as TeamRow).score, params.delta);

  const { error: updateError } = await admin.from("teams").update({ score: resultingScore }).eq("id", params.teamId);
  if (updateError) throw updateError;

  const { data: event, error: eventError } = await admin
    .from("score_events")
    .insert({
      session_id: params.sessionId,
      team_id: params.teamId,
      session_question_id: params.sessionQuestionId ?? null,
      delta: params.delta,
      resulting_score: resultingScore,
      reason: params.reason,
      note: params.note ?? null,
    })
    .select()
    .single();
  if (eventError) throw eventError;

  return event as ScoreEventRow;
}

/** Undo the most recent non-undone score event for the session. */
export async function undoLastScoreEvent(admin: Admin, sessionId: string): Promise<ScoreEventRow | null> {
  const { data: last, error } = await admin
    .from("score_events")
    .select("*")
    .eq("session_id", sessionId)
    .eq("undone", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!last) return null;

  const { data: team, error: teamError } = await admin.from("teams").select("score").eq("id", last.team_id).maybeSingle();
  if (teamError) throw teamError;
  const currentScore = team?.score ?? last.resulting_score;
  const revertedScore = currentScore - last.delta;

  await admin.from("teams").update({ score: revertedScore }).eq("id", last.team_id);
  await admin.from("score_events").update({ undone: true }).eq("id", last.id);

  return last as ScoreEventRow;
}

export async function playSound(sessionId: string, cue: SoundCue) {
  const message: SessionRealtimeEvent = { event: "sound", payload: { cue } };
  await broadcastToSession(sessionId, message);
}
