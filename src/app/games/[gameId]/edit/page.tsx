import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GameEditor } from "@/components/editor/game-editor";
import type { CategoryWithQuestions, QuestionWithMedia } from "@/components/editor/types";
import type { MediaRow } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function EditGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const supabase = await createClient();

  const { data: game } = await supabase.from("games").select("*").eq("id", gameId).maybeSingle();
  if (!game) notFound();

  const { data: categories } = await supabase
    .from("categories")
    .select("*, questions(*, media(*))")
    .eq("game_id", gameId)
    .order("position");

  const normalized: CategoryWithQuestions[] = (categories ?? []).map((c) => ({
    ...c,
    questions: ((c.questions ?? []) as QuestionWithMedia[])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((q) => ({
        ...q,
        media: ((q.media ?? []) as MediaRow[]).slice().sort((a, b) => a.position - b.position),
      })),
  }));

  return <GameEditor game={game} initialCategories={normalized} />;
}
