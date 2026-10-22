"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useFullscreenPortalTarget } from "@/lib/use-fullscreen-portal-target";
import { QrCode } from "./qr-code";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Keeps the join QR/code reachable for the whole game, not just the lobby
 * -- a team that drops out mid-game (loses its saved session: new device,
 * cleared storage, app reinstall) needs a way back in without the host
 * re-reading the code out loud from the start screen.
 */
export function JoinInfoButton({ joinCode }: { joinCode: string }) {
  const [open, setOpen] = useState(false);
  const portalTarget = useFullscreenPortalTarget();
  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/join/${joinCode}` : "";

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded px-2 py-1 hover:bg-white/10">
        👥 Join info
      </button>
      {open &&
        portalTarget &&
        createPortal(
          <div
            className="fixed inset-0 z-[180] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => setOpen(false)}
          >
            <Card className="w-full max-w-xs animate-reveal" onClick={(e) => e.stopPropagation()}>
              <CardBody className="flex flex-col items-center gap-3 text-center">
                <h2 className="font-display text-lg font-semibold">Join this game</h2>
                <p className="text-sm text-muted">
                  A team that drops out can scan this again and rejoin with their <strong>same team name</strong> to
                  keep their score.
                </p>
                {joinUrl && <QrCode value={joinUrl} size={200} />}
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">Game code</p>
                  <p className="font-display text-2xl font-bold tracking-[0.2em] text-accent">{joinCode}</p>
                </div>
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </CardBody>
            </Card>
          </div>,
          portalTarget
        )}
    </>
  );
}
