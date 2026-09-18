"use client";

import { DEFAULT_GAME_SETTINGS, type GameSettings } from "@/types/database";

const KEY = "quiznight.defaultSettings";

export function loadDefaultSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_GAME_SETTINGS;
    return { ...DEFAULT_GAME_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_GAME_SETTINGS;
  }
}

export function saveDefaultSettings(settings: GameSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}
