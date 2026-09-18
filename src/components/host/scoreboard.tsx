"use client";

import { useEffect, useRef, useState } from "react";
import { formatScore } from "@/lib/utils";
import type { PublicTeam } from "@/lib/game/session-types";

export function Scoreboard({ teams }: { teams: PublicTeam[] }) {
  const sorted = [...teams].sort((a, b) => b.score - a.score);
  return (
    <div className="flex flex-wrap justify-center gap-3 px-4 py-3">
      {sorted.map((team) => (
        <TeamScore key={team.id} team={team} />
      ))}
    </div>
  );
}

function TeamScore({ team }: { team: PublicTeam }) {
  const [pop, setPop] = useState(false);
  const prevScore = useRef(team.score);

  useEffect(() => {
    if (prevScore.current !== team.score) {
      setPop(true);
      prevScore.current = team.score;
      const t = setTimeout(() => setPop(false), 500);
      return () => clearTimeout(t);
    }
  }, [team.score]);

  return (
    <div className="flex min-w-[140px] flex-col items-center rounded-xl border border-border bg-background-card px-4 py-2.5">
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <span className={`h-1.5 w-1.5 rounded-full ${team.connected ? "bg-success" : "bg-danger"}`} />
        <span className="truncate max-w-[140px]">{team.name}</span>
      </div>
      <div className={`font-display text-2xl font-bold tabular-nums ${pop ? "animate-score-pop text-accent" : ""}`}>
        {formatScore(team.score)}
      </div>
    </div>
  );
}
