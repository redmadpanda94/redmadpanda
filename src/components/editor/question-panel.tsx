"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { friendlyError, useToast } from "@/components/ui/toast";
import type { QuestionWithMedia } from "./types";
import { MediaManager } from "./media-manager";

export function QuestionPanel({
  question,
  onChange,
  onDelete,
}: {
  question: QuestionWithMedia;
  onChange: (patch: Partial<QuestionWithMedia>) => void;
  onDelete: () => void;
}) {
  const toast = useToast();
  // GameEditor renders this with key={question.id}, so a fresh instance
  // (and fresh state) mounts whenever the selected question changes.
  const [local, setLocal] = useState(question);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleSave(patch: Partial<QuestionWithMedia>) {
    const next = { ...local, ...patch };
    setLocal(next);
    onChange(patch);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => save(next), 500);
  }

  async function save(state: QuestionWithMedia) {
    try {
      const res = await fetch(`/api/questions/${question.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          points: state.points,
          questionText: state.question_text,
          answerText: state.answer_text,
          notes: state.notes ?? undefined,
          mediaPlacement: state.media_placement,
          isFinal: state.is_final,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    } catch (err) {
      toast.show(friendlyError(err), "error");
    }
  }

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Question</h2>
        <Button size="sm" variant="danger" onClick={onDelete}>
          Delete
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="points">Point value</Label>
          <Input
            id="points"
            type="number"
            value={local.points}
            onChange={(e) => scheduleSave({ points: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={local.is_final}
              onChange={(e) => scheduleSave({ is_final: e.target.checked })}
            />
            Final Question
          </label>
        </div>
      </div>

      <div>
        <Label htmlFor="question">Question</Label>
        <Textarea
          id="question"
          rows={3}
          value={local.question_text}
          onChange={(e) => scheduleSave({ question_text: e.target.value })}
          placeholder="Which movie is this scene from?"
        />
      </div>

      <div>
        <Label htmlFor="answer">Answer</Label>
        <Textarea
          id="answer"
          rows={2}
          value={local.answer_text}
          onChange={(e) => scheduleSave({ answer_text: e.target.value })}
          placeholder="The Matrix (1999)"
        />
      </div>

      <div>
        <Label htmlFor="notes">Host notes (optional)</Label>
        <Textarea
          id="notes"
          rows={2}
          value={local.notes ?? ""}
          onChange={(e) => scheduleSave({ notes: e.target.value })}
          placeholder="Accept 'Matrix' as a correct answer too"
        />
      </div>

      <div>
        <Label htmlFor="placement">Media placement</Label>
        <Select
          id="placement"
          value={local.media_placement}
          onChange={(e) => scheduleSave({ media_placement: e.target.value as QuestionWithMedia["media_placement"] })}
        >
          <option value="before_question">Before question</option>
          <option value="after_question">After question</option>
          <option value="instead_of_question">Instead of question</option>
        </Select>
      </div>

      <MediaManager
        questionId={question.id}
        media={local.media}
        onChange={(media) => {
          setLocal((prev) => ({ ...prev, media }));
          onChange({ media });
        }}
      />
    </div>
  );
}
