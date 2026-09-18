"use client";

import { useConfirm } from "@/components/ui/confirm-provider";
import { useSessionAction } from "./session-actions";

export function HostToolbar({ sessionId }: { sessionId: string }) {
  const { call } = useSessionAction(sessionId);
  const confirm = useConfirm();

  async function pause() {
    await call("/pause");
  }

  async function reset() {
    const ok = await confirm({
      title: "Reset this game session?",
      description: "This clears all scores and buzz history and returns every question to the board. Teams stay connected.",
      tone: "danger",
      confirmLabel: "Reset session",
    });
    if (ok) await call("/reset");
  }

  async function finish() {
    const ok = await confirm({
      title: "End the game now?",
      description: "This shows the final scoreboard to everyone. You can't go back to the board afterward.",
      tone: "danger",
      confirmLabel: "End game",
    });
    if (ok) await call("/finish");
  }

  return (
    <div className="flex items-center gap-1 text-xs">
      <button onClick={pause} className="rounded px-2 py-1 text-muted hover:bg-white/10 hover:text-foreground">
        ⏸ Pause
      </button>
      <button onClick={reset} className="rounded px-2 py-1 text-muted hover:bg-white/10 hover:text-foreground">
        ↺ Reset
      </button>
      <button onClick={finish} className="rounded px-2 py-1 text-danger hover:bg-danger/10">
        ■ End game
      </button>
    </div>
  );
}
