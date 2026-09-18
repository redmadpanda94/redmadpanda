"use client";

import { useEffect, useState } from "react";
import { useSessionChannel } from "@/lib/realtime/use-session-channel";
import { useSoundEffects } from "@/lib/sound/use-sound-effects";
import { useHeartbeat } from "@/lib/use-heartbeat";
import { useWakeLock } from "@/lib/use-wake-lock";
import { loadTeamSession, type TeamSession } from "@/lib/team-session";
import { deriveTeamBuzzView } from "@/lib/game/team-buzz-view";
import { formatScore } from "@/lib/utils";
import { TeamJoinForm } from "./team-join-form";
import { FinalWagerForm } from "./final-wager-form";
import { BuzzButton } from "./buzz-button";

export function TeamApp({ sessionId }: { sessionId: string }) {
  const [team, setTeam] = useState<TeamSession | null | undefined>(undefined);
  const { playSound } = useSoundEffects();
  const { state, connection } = useSessionChannel(sessionId, playSound);

  useEffect(() => {
    // localStorage is client-only; reading it post-mount avoids an SSR
    // hydration mismatch (server always renders the "loading" state).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTeam(loadTeamSession(sessionId));
  }, [sessionId]);

  useHeartbeat(sessionId, team?.teamId ?? null, team?.token ?? null);
  useWakeLock(!!team);

  if (team === undefined || !state) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted">Loading…</p>
      </div>
    );
  }

  if (!team) {
    return <TeamJoinForm sessionId={sessionId} joinCode={state.joinCode} onJoined={() => setTeam(loadTeamSession(sessionId))} />;
  }

  const myTeam = state.teams.find((t) => t.id === team.teamId);
  const teamStillInGame = !!myTeam;

  if (!teamStillInGame) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="text-4xl">👋</div>
        <p className="font-display text-lg font-semibold">You&apos;ve been removed from this game</p>
        <p className="text-sm text-muted">Ask the host for the game code to rejoin.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="flex items-center justify-between px-4 py-3 text-xs text-muted">
        <span>{connection === "connected" ? "🟢 Connected" : "🔴 Reconnecting…"}</span>
        <span className="font-mono">{state.joinCode}</span>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4">
        <p className="font-display text-lg font-semibold">{team.teamName}</p>
        <p className="font-display text-4xl font-bold tabular-nums text-accent">{formatScore(myTeam.score)}</p>
      </div>

      {state.status === "final_question" && state.currentQuestion ? (
        <FinalWagerForm
          sessionId={sessionId}
          teamId={team.teamId}
          token={team.token}
          score={myTeam.score}
          categoryName={state.currentQuestion.categoryName}
        />
      ) : (
        <BuzzButton sessionId={sessionId} teamId={team.teamId} token={team.token} view={deriveTeamBuzzView(state, team.teamId)} />
      )}
    </div>
  );
}
