"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { GameRow } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { friendlyError, useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-provider";
import { loadDefaultSettings } from "@/lib/default-settings";

export interface GameWithCounts extends GameRow {
  categoryCount: number;
  sessionCount: number;
}

export function GameLibrary({ initialGames }: { initialGames: GameWithCounts[] }) {
  const [games, setGames] = useState(initialGames);
  const [showCreate, setShowCreate] = useState(false);
  const router = useRouter();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted">
          {games.length} {games.length === 1 ? "game" : "games"}
        </p>
        <Button onClick={() => setShowCreate(true)} size="lg">
          + Create Game
        </Button>
      </div>

      {games.length === 0 ? (
        <Card className="border-dashed">
          <CardBody className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="text-4xl">🎬</div>
            <h2 className="font-display text-xl font-semibold">No games yet</h2>
            <p className="max-w-sm text-sm text-muted">
              Create your first quiz to start building categories, questions, and media for quiz night.
            </p>
            <Button onClick={() => setShowCreate(true)} className="mt-2">
              + Create Game
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <GameCard key={game.id} game={game} onRemoved={() => setGames((g) => g.filter((x) => x.id !== game.id))} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateGameModal
          onClose={() => setShowCreate(false)}
          onCreated={(game) => {
            setShowCreate(false);
            router.push(`/games/${game.id}/edit`);
          }}
        />
      )}
    </div>
  );
}

function GameCard({ game, onRemoved }: { game: GameWithCounts; onRemoved: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();

  function duplicate() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/games/${game.id}/duplicate`, { method: "POST" });
        if (!res.ok) throw new Error((await res.json()).error);
        toast.show("Game duplicated.", "success");
        router.refresh();
      } catch (err) {
        toast.show(friendlyError(err), "error");
      }
    });
  }

  function remove() {
    startTransition(async () => {
      const ok = await confirm({
        title: `Delete "${game.title}"?`,
        description: "This permanently deletes the quiz, its categories, questions, and media. This cannot be undone.",
        confirmLabel: "Delete game",
        tone: "danger",
      });
      if (!ok) return;
      try {
        const res = await fetch(`/api/games/${game.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error((await res.json()).error);
        onRemoved();
        toast.show("Game deleted.", "success");
      } catch (err) {
        toast.show(friendlyError(err), "error");
      }
    });
  }

  function play() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/games/${game.id}/sessions`, { method: "POST" });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error);
        router.push(`/play/${body.session.id}`);
      } catch (err) {
        toast.show(friendlyError(err), "error");
      }
    });
  }

  return (
    <Card className="flex flex-col justify-between transition-transform hover:-translate-y-0.5">
      <CardBody className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-semibold leading-snug">{game.title}</h3>
          <Badge tone={game.game_type === "classic" ? "primary" : "accent"}>{game.game_type}</Badge>
        </div>
        {game.description && <p className="mt-2 line-clamp-2 text-sm text-muted">{game.description}</p>}
        <div className="mt-3 flex gap-3 text-xs text-muted">
          <span>{game.categoryCount} categories</span>
          <span>·</span>
          <span>{game.sessionCount} sessions played</span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button size="sm" variant="accent" disabled={pending} onClick={play}>
            ▶ Play
          </Button>
          <Link href={`/games/${game.id}/edit`}>
            <Button size="sm" variant="secondary">
              Edit
            </Button>
          </Link>
          <Link href={`/games/${game.id}/preview`}>
            <Button size="sm" variant="secondary">
              Preview
            </Button>
          </Link>
          <Button size="sm" variant="secondary" disabled={pending} onClick={duplicate}>
            Duplicate
          </Button>
          <a href={`/api/games/${game.id}/export`} download>
            <Button size="sm" variant="secondary">
              ⬇ Export
            </Button>
          </a>
          <Button size="sm" variant="danger" disabled={pending} onClick={remove}>
            Delete
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function CreateGameModal({ onClose, onCreated }: { onClose: () => void; onCreated: (game: GameRow) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [gameType, setGameType] = useState<"classic" | "custom">("classic");
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await fetch("/api/games", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, description, gameType, settings: loadDefaultSettings() }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error);
        onCreated(body.game);
      } catch (err) {
        toast.show(friendlyError(err), "error");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
      <Card className="w-full max-w-md animate-reveal">
        <CardBody>
          <h2 className="font-display text-xl font-semibold">Create a new game</h2>
          <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Movie Night Quiz" autoFocus />
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea id="description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Friends quiz night, movies edition" />
            </div>
            <div>
              <Label>Board type</Label>
              <div className="flex gap-2">
                <Button type="button" variant={gameType === "classic" ? "primary" : "secondary"} onClick={() => setGameType("classic")}>
                  Classic (5×5)
                </Button>
                <Button type="button" variant={gameType === "custom" ? "primary" : "secondary"} onClick={() => setGameType("custom")}>
                  Custom
                </Button>
              </div>
            </div>
            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !title.trim()}>
                {pending ? "Creating…" : "Create & edit"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
