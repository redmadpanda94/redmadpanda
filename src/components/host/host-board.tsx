"use client";

import { useState } from "react";
import { BoardGrid, type BoardCell } from "./board-grid";
import { Scoreboard } from "./scoreboard";
import { useSessionAction } from "./session-actions";
import type { SessionPublicState } from "@/lib/game/session-types";

export function HostBoard({ sessionId, state }: { sessionId: string; state: SessionPublicState }) {
  const { call, pending } = useSessionAction(sessionId);
  const [selecting, setSelecting] = useState(false);

  async function selectCell(cell: BoardCell) {
    setSelecting(true);
    try {
      await call("/select-question", { sessionQuestionId: cell.id });
    } finally {
      setSelecting(false);
    }
  }

  const remaining = state.board.reduce((sum, c) => sum + c.cells.filter((cell) => cell.status !== "completed").length, 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Scoreboard teams={state.teams} />
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-4 py-4">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{state.title}</h1>
        <BoardGrid categories={state.board} onSelectCell={selectCell} disabled={selecting || pending !== null} />
        {remaining === 0 && (
          <p className="text-sm text-muted">All questions completed — end the game or start a Final Question if you added one.</p>
        )}
      </div>
    </div>
  );
}
