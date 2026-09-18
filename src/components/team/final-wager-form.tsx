"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { friendlyError, useToast } from "@/components/ui/toast";
import { clampFinalWager } from "@/lib/game/scoring";
import { formatScore } from "@/lib/utils";

export function FinalWagerForm({
  sessionId,
  teamId,
  token,
  score,
  categoryName,
}: {
  sessionId: string;
  teamId: string;
  token: string;
  score: number;
  categoryName: string;
}) {
  const [amount, setAmount] = useState(0);
  const [submitted, setSubmitted] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const toast = useToast();
  const max = Math.max(score, 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const clamped = clampFinalWager(amount, score);
    setPending(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/final/wager`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, token, amount: clamped }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setSubmitted(body.amount);
    } catch (err) {
      toast.show(friendlyError(err), "error");
    } finally {
      setPending(false);
    }
  }

  if (submitted !== null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="text-4xl">✅</div>
        <p className="font-display text-xl font-bold">Wager locked in</p>
        <p className="text-muted">
          You wagered <span className="text-accent font-semibold">{formatScore(submitted)}</span> points.
        </p>
        <p className="mt-4 text-sm text-muted">Watch the host screen for the question…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">🏆 Final Question</p>
      <h1 className="font-display text-2xl font-bold">{categoryName}</h1>
      <p className="text-sm text-muted">Your score: {formatScore(score)}. Place your wager:</p>
      <form onSubmit={submit} className="flex w-full max-w-xs flex-col gap-3">
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          max={max}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="text-center text-2xl font-display font-bold"
        />
        <div className="flex justify-center gap-2 text-xs">
          {[0, 0.25, 0.5, 1].map((frac) => (
            <button
              key={frac}
              type="button"
              onClick={() => setAmount(Math.round(max * frac))}
              className="rounded-full bg-white/5 px-3 py-1 hover:bg-white/10"
            >
              {frac === 0 ? "0" : `${frac * 100}%`}
            </button>
          ))}
        </div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Submitting…" : "Lock in wager"}
        </Button>
      </form>
    </div>
  );
}
