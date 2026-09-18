"use client";

import { useState } from "react";
import { BoardGrid, type BoardCategoryData } from "./board-grid";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CategoryWithQuestions, QuestionWithMedia } from "@/components/editor/types";

export function PreviewBoard({ categories }: { categories: CategoryWithQuestions[] }) {
  const [open, setOpen] = useState<QuestionWithMedia | null>(null);

  const boardData: BoardCategoryData[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    cells: c.questions.map((q) => ({ id: q.id, points: q.points, status: "available", isFinal: q.is_final })),
  }));

  function find(id: string) {
    for (const c of categories) {
      const q = c.questions.find((q) => q.id === id);
      if (q) return q;
    }
    return null;
  }

  return (
    <>
      <BoardGrid categories={boardData} onSelectCell={(cell) => setOpen(find(cell.id))} />
      {open && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 p-4" onClick={() => setOpen(null)}>
          <Card className="w-full max-w-xl animate-reveal" onClick={(e) => e.stopPropagation()}>
            <CardBody>
              <p className="text-xs uppercase tracking-wide text-accent">{open.points} points</p>
              <h3 className="mt-2 font-display text-xl font-semibold">{open.question_text || "(No question text yet)"}</h3>
              <div className="mt-4 rounded-lg bg-background-elevated p-4">
                <p className="text-xs uppercase tracking-wide text-muted">Answer</p>
                <p className="mt-1 text-foreground">{open.answer_text || "(No answer yet)"}</p>
              </div>
              {open.media.length > 0 && (
                <p className="mt-3 text-xs text-muted">{open.media.length} media item(s) attached — placement: {open.media_placement.replace(/_/g, " ")}</p>
              )}
              <div className="mt-5 flex justify-end">
                <Button variant="secondary" onClick={() => setOpen(null)}>
                  Close
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </>
  );
}
