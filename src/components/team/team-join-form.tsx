"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { friendlyError, useToast } from "@/components/ui/toast";
import { saveTeamSession } from "@/lib/team-session";

export function TeamJoinForm({
  sessionId,
  joinCode,
  onJoined,
}: {
  sessionId: string;
  joinCode: string;
  onJoined: () => void;
}) {
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const toast = useToast();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await fetch("/api/sessions/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode, name }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      saveTeamSession(sessionId, { teamId: body.teamId, token: body.token, teamName: body.teamName });
      onJoined();
    } catch (err) {
      toast.show(friendlyError(err), "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-3xl">🎯</div>
      <h1 className="font-display text-2xl font-bold">Join this game</h1>
      <p className="mt-1 text-sm text-muted">Enter a team name for this device</p>
      <form onSubmit={submit} className="mt-6 flex w-full max-w-xs flex-col gap-4 text-left">
        <div>
          <Label htmlFor="teamName">Team name</Label>
          <Input id="teamName" autoFocus required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="The Quizzards" />
        </div>
        <Button type="submit" size="lg" disabled={pending || !name.trim()}>
          {pending ? "Joining…" : "Join game"}
        </Button>
      </form>
    </div>
  );
}
