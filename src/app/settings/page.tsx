"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/input";
import { loadDefaultSettings, saveDefaultSettings } from "@/lib/default-settings";
import { DEFAULT_GAME_SETTINGS, type GameSettings } from "@/types/database";
import { useToast } from "@/components/ui/toast";

const COUNTDOWN_OPTIONS = [
  { label: "Disabled", value: "" },
  { label: "5 seconds", value: "5" },
  { label: "10 seconds", value: "10" },
  { label: "15 seconds", value: "15" },
  { label: "30 seconds", value: "30" },
  { label: "60 seconds", value: "60" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const toast = useToast();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only localStorage read, avoids SSR mismatch
    setSettings(loadDefaultSettings());
    setLoaded(true);
  }, []);

  function save() {
    saveDefaultSettings(settings);
    toast.show("Default settings saved. They'll apply to new games you create.", "success");
  }

  if (!loaded) return null;

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-5 py-10">
      <Link href="/dashboard" className="text-sm text-muted hover:text-foreground">
        ← Library
      </Link>
      <h1 className="mt-2 font-display text-3xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-muted">
        These defaults are applied whenever you create a new game. Each game can still override them individually
        from its editor (⚙ Settings).
      </p>

      <Card className="mt-6">
        <CardBody className="flex flex-col gap-4">
          <div>
            <Label htmlFor="countdown">Default countdown timer</Label>
            <Select
              id="countdown"
              value={settings.defaultCountdownSeconds === null ? "" : String(settings.defaultCountdownSeconds)}
              onChange={(e) => setSettings({ ...settings, defaultCountdownSeconds: e.target.value ? Number(e.target.value) : null })}
            >
              {COUNTDOWN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>

          <ToggleRow label="Sound effects" checked={settings.soundEffectsEnabled} onChange={(v) => setSettings({ ...settings, soundEffectsEnabled: v })} />

          <div>
            <Label htmlFor="penalty">Points lost on an incorrect answer</Label>
            <Select
              id="penalty"
              value={settings.incorrectPenalty}
              onChange={(e) => setSettings({ ...settings, incorrectPenalty: e.target.value as GameSettings["incorrectPenalty"] })}
            >
              <option value="full">Full point value</option>
              <option value="half">Half the point value</option>
              <option value="none">No penalty (score unchanged)</option>
            </Select>
          </div>

          <ToggleRow label="Autoplay media" checked={settings.mediaAutoplay} onChange={(v) => setSettings({ ...settings, mediaAutoplay: v })} />

          <div className="mt-2 flex justify-end">
            <Button onClick={save}>Save defaults</Button>
          </div>
        </CardBody>
      </Card>

      <Card className="mt-4">
        <CardBody>
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted">About</h2>
          <p className="mt-2 text-sm text-muted">
            Quiz Night is a private, friends-only quiz platform. The sound toggle in the top bar during a live game
            controls this device only. The theme is a fixed dark, high-contrast palette designed for TVs and
            projectors.
          </p>
        </CardBody>
      </Card>

      <p className="mt-4 text-xs text-muted">
        Tip: the 🔊 sound toggle in the top bar of a live game is per-device and takes effect immediately.
      </p>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-lg bg-background-elevated px-3 py-2.5 text-sm">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
    </label>
  );
}
