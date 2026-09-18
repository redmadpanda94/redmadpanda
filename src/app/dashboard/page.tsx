import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GameLibrary, type GameWithCounts } from "@/components/host/game-library";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/host/sign-out-button";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: games } = await supabase
    .from("games")
    .select("*, categories(count), game_sessions(count)")
    .order("updated_at", { ascending: false });

  const gamesWithCounts: GameWithCounts[] = (games ?? []).map((g) => ({
    ...g,
    categoryCount: g.categories?.[0]?.count ?? 0,
    sessionCount: g.game_sessions?.[0]?.count ?? 0,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Game Library</h1>
          <p className="mt-1 text-sm text-muted">Signed in as {user?.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/settings">
            <Button variant="secondary">Settings</Button>
          </Link>
          <SignOutButton />
        </div>
      </header>

      <GameLibrary initialGames={gamesWithCounts} />
    </div>
  );
}
