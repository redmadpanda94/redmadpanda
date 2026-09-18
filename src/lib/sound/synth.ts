"use client";

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) ctx = new AudioCtx();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

interface Tone {
  freq: number;
  duration: number;
  delay?: number;
  type?: OscillatorType;
  gain?: number;
}

/** Tiny synthesized sound effects -- no external audio assets to license or fetch. */
export function playTones(tones: Tone[]) {
  const audioCtx = getContext();
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  for (const tone of tones) {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = tone.type ?? "sine";
    osc.frequency.value = tone.freq;
    const start = now + (tone.delay ?? 0);
    const end = start + tone.duration;
    gainNode.gain.setValueAtTime(0, start);
    gainNode.gain.linearRampToValueAtTime(tone.gain ?? 0.15, start + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, end);
    osc.connect(gainNode).connect(audioCtx.destination);
    osc.start(start);
    osc.stop(end + 0.02);
  }
}

export const SOUND_PATTERNS: Record<string, Tone[]> = {
  question_selected: [{ freq: 440, duration: 0.12 }],
  reveal: [{ freq: 520, duration: 0.1 }, { freq: 660, duration: 0.15, delay: 0.1 }],
  buzzer_enabled: [{ freq: 660, duration: 0.08 }, { freq: 880, duration: 0.1, delay: 0.09 }],
  first_buzz: [{ freq: 990, duration: 0.15, type: "square" }],
  correct: [
    { freq: 523, duration: 0.1 },
    { freq: 659, duration: 0.1, delay: 0.1 },
    { freq: 784, duration: 0.2, delay: 0.2 },
  ],
  incorrect: [{ freq: 220, duration: 0.25, type: "sawtooth" }],
  countdown: [{ freq: 780, duration: 0.06 }],
  time_expired: [{ freq: 300, duration: 0.3, type: "square" }],
  final_question: [
    { freq: 440, duration: 0.15 },
    { freq: 554, duration: 0.15, delay: 0.15 },
    { freq: 659, duration: 0.25, delay: 0.3 },
  ],
};
