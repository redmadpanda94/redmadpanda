"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { friendlyError, useToast } from "@/components/ui/toast";
import { DEFAULT_GAME_SETTINGS, type GameSettings } from "@/types/database";

const COUNTDOWN_OPTIONS = [
  { label: "Disabled", value: "" },
  { label: "5 seconds", value: "5" },
  { label: "10 seconds", value: "10" },
  { label: "15 seconds", value: "15" },
  { label: "30 seconds", value: "30" },
  { label: "60 seconds", value: "60" },
  { label: "Custom", value: "custom" },
];

export function GameSettingsPanel({
  gameId,
  settings,
  onChange,
  onClose,
}: {
  gameId: string;
  settings: GameSettings;
  onChange: (settings: GameSettings) => void;
  onClose: () => void;
}) {
  // Defensively merged with defaults so a game saved before a settings field
  // was added (e.g. incorrectPenalty replacing the old boolean toggle) still
  // gets a valid value instead of `undefined`.
  const [local, setLocal] = useState({ ...DEFAULT_GAME_SETTINGS, ...settings });
  const [customCountdown, setCustomCountdown] = useState(
    local.defaultCountdownSeconds && !COUNTDOWN_OPTIONS.some((o) => o.value === String(local.defaultCountdownSeconds))
      ? String(local.defaultCountdownSeconds)
      : ""
  );
  const [pending, setPending] = useState(false);
  const toast = useToast();

  const countdownSelectValue = customCountdown
    ? "custom"
    : local.defaultCountdownSeconds === null
      ? ""
      : String(local.defaultCountdownSeconds);

  async function save() {
    setPending(true);
    try {
      const res = await fetch(`/api/games/${gameId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: local }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      onChange(local);
      onClose();
    } catch (err) {
      toast.show(friendlyError(err), "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
      <Card className="w-full max-w-md animate-reveal">
        <CardBody>
          <h2 className="font-display text-xl font-semibold">Game settings</h2>
          <div className="mt-4 flex flex-col gap-4">
            <div>
              <Label htmlFor="countdown">Default countdown timer</Label>
              <Select
                id="countdown"
                value={countdownSelectValue}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "custom") {
                    setCustomCountdown("30");
                    setLocal({ ...local, defaultCountdownSeconds: 30 });
                  } else {
                    setCustomCountdown("");
                    setLocal({ ...local, defaultCountdownSeconds: v ? Number(v) : null });
                  }
                }}
              >
                {COUNTDOWN_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              {customCountdown && (
                <Input
                  type="number"
                  min={1}
                  max={600}
                  className="mt-2"
                  value={customCountdown}
                  onChange={(e) => {
                    setCustomCountdown(e.target.value);
                    setLocal({ ...local, defaultCountdownSeconds: Number(e.target.value) || 0 });
                  }}
                />
              )}
            </div>

            <ToggleRow
              label="Sound effects"
              checked={local.soundEffectsEnabled}
              onChange={(v) => setLocal({ ...local, soundEffectsEnabled: v })}
            />
            <div>
              <Label htmlFor="penalty">Points lost on an incorrect answer</Label>
              <Select
                id="penalty"
                value={local.incorrectPenalty}
                onChange={(e) => setLocal({ ...local, incorrectPenalty: e.target.value as GameSettings["incorrectPenalty"] })}
              >
                <option value="full">Full point value</option>
                <option value="half">Half the point value</option>
                <option value="none">No penalty (score unchanged)</option>
              </Select>
            </div>
            <ToggleRow
              label="Autoplay media"
              checked={local.mediaAutoplay}
              onChange={(v) => setLocal({ ...local, mediaAutoplay: v })}
            />
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save settings"}
            </Button>
          </div>
        </CardBody>
      </Card>
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
