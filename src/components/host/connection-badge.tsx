import type { ConnectionStatus } from "@/lib/realtime/use-session-channel";

export function ConnectionBadge({ connection }: { connection: ConnectionStatus }) {
  if (connection === "connected") {
    return (
      <span className="flex items-center gap-1 text-success">
        <span className="h-1.5 w-1.5 rounded-full bg-success" /> Connected
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-accent">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" /> Reconnecting…
    </span>
  );
}
