import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PreviewBoard } from "@/components/host/preview-board";
import type { QuestionWithMedia } from "@/components/editor/types";

export const dynamic = "force-dynamic";

export default async function PreviewGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const supabase = await createClient();

  const { data: game } = await supabase.from("games").select("*").eq("id", gameId).maybeSingle();
  if (!game) notFound();

  const { data: categories } = await supabase
    .from("categories")
    .select("*, questions(*, media(*))")
    .eq("game_id", gameId)
    .order("position");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <Link href={`/games/${gameId}/edit`} className="text-sm text-muted hover:text-foreground">
            ← Back to editor
          </Link>
          <h1 className="mt-1 font-display text-2xl font-bold">{game.title} — Preview</h1>
        </div>
        <Link href={`/games/${gameId}/edit`}>
          <Button variant="secondary">Edit</Button>
        </Link>
      </header>
      <PreviewBoard
        categories={(categories ?? []).map((c) => ({
          ...c,
          questions: ((c.questions ?? []) as QuestionWithMedia[]).slice().sort((a, b) => a.position - b.position),
        }))}
      />
    </div>
  );
}
