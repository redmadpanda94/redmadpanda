import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SessionHost } from "@/components/host/session-host";

export const dynamic = "force-dynamic";

export default async function PlaySessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase.from("game_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (!session) notFound();

  return (
    <SessionHost sessionId={sessionId} gameId={session.game_id} initialTitle={session.title} initialJoinCode={session.join_code} />
  );
}
