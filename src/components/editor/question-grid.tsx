"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CategoryWithQuestions, QuestionWithMedia } from "./types";

const STANDARD_POINTS = [100, 200, 300, 400, 500];

export function QuestionGrid({
  category,
  selectedQuestionId,
  onSelectQuestion,
  onAddQuestion,
  onDuplicateQuestion,
  onRemoveQuestion,
}: {
  category: CategoryWithQuestions;
  selectedQuestionId: string | null;
  onSelectQuestion: (id: string) => void;
  onAddQuestion: (points: number) => void;
  onDuplicateQuestion: (question: QuestionWithMedia) => void;
  onRemoveQuestion: (id: string) => void;
}) {
  const [customPoints, setCustomPoints] = useState("");
  const usedPoints = new Set(category.questions.map((q) => q.points));
  const suggested = STANDARD_POINTS.filter((p) => !usedPoints.has(p));

  return (
    <div className="flex flex-col gap-5 overflow-y-auto p-5">
      <div>
        <h2 className="font-display text-lg font-semibold">{category.name}</h2>
        <p className="text-sm text-muted">{category.questions.length} questions</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {category.questions
          .slice()
          .sort((a, b) => a.points - b.points)
          .map((question) => (
            <QuestionTile
              key={question.id}
              question={question}
              active={question.id === selectedQuestionId}
              onSelect={() => onSelectQuestion(question.id)}
              onDuplicate={() => onDuplicateQuestion(question)}
              onRemove={() => onRemoveQuestion(question.id)}
            />
          ))}
      </div>

      <div className="rounded-xl border border-dashed border-border p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Add question</p>
        <div className="flex flex-wrap gap-2">
          {suggested.map((points) => (
            <Button key={points} size="sm" variant="secondary" onClick={() => onAddQuestion(points)}>
              +{points}
            </Button>
          ))}
          <div className="flex items-center gap-1.5">
            <Input
              placeholder="Custom"
              value={customPoints}
              onChange={(e) => setCustomPoints(e.target.value.replace(/\D/g, ""))}
              className="h-9 w-24 py-1"
            />
            <Button
              size="sm"
              variant="secondary"
              disabled={!customPoints}
              onClick={() => {
                onAddQuestion(Number(customPoints));
                setCustomPoints("");
              }}
            >
              Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuestionTile({
  question,
  active,
  onSelect,
  onDuplicate,
  onRemove,
}: {
  question: QuestionWithMedia;
  active: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const complete = question.question_text.trim() && question.answer_text.trim();
  return (
    <div
      onClick={onSelect}
      className={cn(
        "group relative flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border p-3 text-center transition-all",
        active ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border bg-background-card hover:border-primary/40"
      )}
    >
      <span className="font-display text-2xl font-bold text-accent">{question.points}</span>
      {question.is_final && <span className="text-[10px] font-semibold uppercase text-accent">Final</span>}
      {!complete && <span className="text-[10px] text-danger">Needs content</span>}
      {question.media.length > 0 && <span className="text-[10px] text-muted">{question.media.length} media</span>}
      <div className="absolute right-1 top-1 hidden gap-1 group-hover:flex">
        <button
          className="rounded bg-black/40 p-1 text-[10px] hover:bg-black/60"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          aria-label="Duplicate question"
        >
          ⧉
        </button>
        <button
          className="rounded bg-black/40 p-1 text-[10px] hover:bg-danger/60"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label="Delete question"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
