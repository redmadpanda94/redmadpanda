"use client";

import { useState } from "react";
import { QrCode } from "./qr-code";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { friendlyError, useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-provider";
import type { SessionPublicState } from "@/lib/game/session-types";

export function HostLobby({ sessionId, state }: { sessionId: string; state: SessionPublicState }) {
  const [starting, setStarting] = useState(false);
  const toast = useToast();
  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/join/${state.joinCode}` : "";

  async function start() {
    setStarting(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/start`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
    } catch (err) {
      toast.show(friendlyError(err), "error");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-10 px-5 py-10 text-center">
      <div>
        <h1 className="font-display text-4xl font-bold">{state.title}</h1>
        <p className="mt-2 text-muted">Scan the QR code or enter the game code to join</p>
      </div>

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-10">
        <Card>
          <CardBody className="flex flex-col items-center gap-3">
            {joinUrl && <QrCode value={joinUrl} />}
            <div className="text-center">
              <p className="text-xs uppercase tracking-wide text-muted">Game code</p>
              <p className="font-display text-3xl font-bold tracking-[0.2em] text-accent">{state.joinCode}</p>
            </div>
          </CardBody>
        </Card>

        <Card className="w-full max-w-sm text-left">
          <CardBody>
            <h2 className="mb-3 font-display text-lg font-semibold">
              Connected teams ({state.teams.length})
            </h2>
            {state.teams.length === 0 ? (
              <p className="text-sm text-muted">Waiting for teams to join…</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {state.teams.map((team) => (
                  <TeamRow key={team.id} sessionId={sessionId} team={team} />
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Button size="xl" variant="accent" disabled={state.teams.length === 0 || starting} onClick={start}>
        {starting ? "Starting…" : "Start Game →"}
      </Button>
    </div>
  );
}

function TeamRow({ sessionId, team }: { sessionId: string; team: SessionPublicState["teams"][number] }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.name);
  const toast = useToast();
  const confirm = useConfirm();

  async function rename() {
    setEditing(false);
    if (name.trim() === team.name || !name.trim()) {
      setName(team.name);
      return;
    }
    try {
      const res = await fetch(`/api/sessions/${sessionId}/teams/${team.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    } catch (err) {
      setName(team.name);
      toast.show(friendlyError(err), "error");
    }
  }

  async function remove() {
    const ok = await confirm({ title: `Remove "${team.name}"?`, tone: "danger", confirmLabel: "Remove" });
    if (!ok) return;
    try {
      const res = await fetch(`/api/sessions/${sessionId}/teams/${team.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
    } catch (err) {
      toast.show(friendlyError(err), "error");
    }
  }

  return (
    <li className="flex items-center gap-2 rounded-lg bg-background-elevated px-3 py-2">
      <span className={`h-2 w-2 rounded-full ${team.connected ? "bg-success" : "bg-danger"}`} />
      {editing ? (
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={rename}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="h-7 flex-1 py-1"
        />
      ) : (
        <span className="flex-1 truncate text-sm font-medium" onDoubleClick={() => setEditing(true)}>
          {team.name}
        </span>
      )}
      <button className="text-xs text-muted hover:text-foreground" onClick={() => setEditing(true)}>
        Rename
      </button>
      <button className="text-xs text-danger hover:underline" onClick={remove}>
        Remove
      </button>
    </li>
  );
}
