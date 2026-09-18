"use client";

import { useCallback, useEffect, useState } from "react";
import { playTones, SOUND_PATTERNS } from "./synth";
import type { SoundCue } from "@/lib/game/session-types";

const STORAGE_KEY = "quiznight.soundEnabled";

export function useSoundEffects() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    // Reads localStorage post-mount (client-only) to avoid an SSR hydration
    // mismatch; a one-frame flicker to the persisted value is expected here.
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored !== null) setEnabled(stored === "1");
    } catch {
      // ignore
    }
  }, []);

  const playSound = useCallback(
    (cue: SoundCue) => {
      if (!enabled) return;
      const pattern = SOUND_PATTERNS[cue];
      if (pattern) playTones(pattern);
    },
    [enabled]
  );

  function toggle() {
    setEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  const SoundToggle = (
    <button onClick={toggle} className="rounded px-2 py-1 hover:bg-white/10" aria-label="Toggle sound effects" title="Toggle sound effects">
      {enabled ? "🔊" : "🔇"}
    </button>
  );

  return { playSound, enabled, toggle, SoundToggle };
}
