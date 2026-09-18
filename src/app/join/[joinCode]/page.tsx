"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";
import { friendlyError, useToast } from "@/components/ui/toast";
import { saveTeamSession } from "@/lib/team-session";

export default function JoinPage({ params }: { params: Promise<{ joinCode: string }> }) {
  const { joinCode } = use(params);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
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
      saveTeamSession(body.sessionId, { teamId: body.teamId, token: body.token, teamName: body.teamName });
      router.push(`/t/${body.sessionId}`);
    } catch (err) {
      toast.show(friendlyError(err, "Couldn't join the game. Check the code and try again."), "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-3xl">
          🎯
        </div>
        <h1 className="font-display text-2xl font-bold">Join the quiz</h1>
        <p className="mt-1 text-sm text-muted">
          Game code: <span className="font-mono font-semibold text-accent">{joinCode.toUpperCase()}</span>
        </p>
        <Card className="mt-6 text-left">
          <CardBody>
            <form onSubmit={submit} className="flex flex-col gap-4">
              <div>
                <Label htmlFor="teamName">Team name</Label>
                <Input
                  id="teamName"
                  autoFocus
                  required
                  maxLength={40}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="The Quizzards"
                />
              </div>
              <Button type="submit" size="lg" disabled={pending || !name.trim()}>
                {pending ? "Joining…" : "Join game"}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
