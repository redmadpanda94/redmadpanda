"use client";

import { cn } from "@/lib/utils";
import type { QuestionStatus } from "@/types/database";

export interface BoardCell {
  id: string;
  points: number;
  status: QuestionStatus;
  isFinal?: boolean;
}

export interface BoardCategoryData {
  id: string;
  name: string;
  cells: BoardCell[];
}

export function BoardGrid({
  categories,
  onSelectCell,
  disabled,
}: {
  categories: BoardCategoryData[];
  onSelectCell?: (cell: BoardCell, categoryName: string) => void;
  disabled?: boolean;
}) {
  const maxRows = Math.max(0, ...categories.map((c) => c.cells.length));

  return (
    <div className="w-full overflow-x-auto">
      <div
        className="grid gap-2 sm:gap-3 min-w-[640px]"
        style={{ gridTemplateColumns: `repeat(${categories.length || 1}, minmax(0, 1fr))` }}
      >
        {categories.map((category) => (
          <div key={category.id} className="flex flex-col gap-2 sm:gap-3">
            <div className="flex h-14 items-center justify-center rounded-lg bg-background-elevated px-2 text-center font-display text-sm font-bold uppercase tracking-wide text-foreground sm:text-base">
              {category.name}
            </div>
            {Array.from({ length: maxRows }).map((_, rowIndex) => {
              const cell = category.cells[rowIndex];
              if (!cell) return <div key={rowIndex} className="aspect-[5/3]" />;
              const isCompleted = cell.status === "completed";
              return (
                <button
                  key={cell.id}
                  disabled={disabled || isCompleted}
                  onClick={() => onSelectCell?.(cell, category.name)}
                  className={cn(
                    "aspect-[5/3] rounded-lg border font-display font-bold transition-all duration-150",
                    "flex items-center justify-center text-2xl sm:text-3xl",
                    isCompleted
                      ? "border-white/5 bg-white/[0.03] text-white/15 cursor-default"
                      : "border-transparent bg-gradient-to-b from-primary/25 to-primary/10 text-accent hover:from-primary/40 hover:to-primary/20 hover:-translate-y-0.5 cursor-pointer shadow-md shadow-black/20",
                    cell.isFinal && !isCompleted && "ring-2 ring-accent"
                  )}
                >
                  {isCompleted ? "✓" : cell.points}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
