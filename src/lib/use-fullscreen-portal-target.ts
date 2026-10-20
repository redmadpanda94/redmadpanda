"use client";

import { useEffect, useState } from "react";

/**
 * Modals and toasts must portal into whatever element is currently
 * fullscreened -- the Fullscreen API only displays the fullscreened
 * element and its descendants on screen, so anything left portaled to
 * document.body (the default) becomes invisible, even though it's still
 * open in React state, whenever the host fullscreens the game for a
 * TV/projector (see session-host.tsx's requestFullscreen call).
 */
export function useFullscreenPortalTarget(): Element | null {
  const [target, setTarget] = useState<Element | null>(null);

  useEffect(() => {
    function update() {
      setTarget(document.fullscreenElement ?? document.body);
    }
    update();
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  return target;
}
