import { TeamApp } from "@/components/team/team-app";

export default async function TeamPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <TeamApp sessionId={sessionId} />;
}
