"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CategoryWithQuestions } from "./types";

export function CategoryList({
  categories,
  selectedId,
  onSelect,
  onAdd,
  onRename,
  onRemove,
  onMove,
}: {
  categories: CategoryWithQuestions[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}) {
  return (
    <div className="flex flex-col border-r border-border bg-background-elevated/40 p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Categories</h2>
        <Button size="sm" variant="ghost" onClick={onAdd}>
          + Add
        </Button>
      </div>
      <div className="flex flex-col gap-1">
        {categories.map((category, index) => (
          <CategoryRow
            key={category.id}
            category={category}
            active={category.id === selectedId}
            onSelect={() => onSelect(category.id)}
            onRename={(name) => onRename(category.id, name)}
            onRemove={() => onRemove(category.id)}
            onMoveUp={index > 0 ? () => onMove(category.id, -1) : undefined}
            onMoveDown={index < categories.length - 1 ? () => onMove(category.id, 1) : undefined}
          />
        ))}
        {categories.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-muted">No categories yet.</p>
        )}
      </div>
    </div>
  );
}

function CategoryRow({
  category,
  active,
  onSelect,
  onRename,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  category: CategoryWithQuestions;
  active: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);

  return (
    <div
      className={cn(
        "group flex items-center gap-1 rounded-lg px-2 py-2 cursor-pointer transition-colors",
        active ? "bg-primary/15 text-foreground" : "hover:bg-white/5 text-muted"
      )}
      onClick={onSelect}
    >
      {editing ? (
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onBlur={() => {
            setEditing(false);
            if (name.trim()) onRename(name.trim());
            else setName(category.name);
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="h-7 flex-1 py-1"
        />
      ) : (
        <span className="flex-1 truncate text-sm font-medium" onDoubleClick={() => setEditing(true)}>
          {category.name}
        </span>
      )}
      <span className="text-xs text-muted">{category.questions.length}</span>
      <div className="hidden gap-0.5 group-hover:flex">
        {onMoveUp && (
          <button
            className="rounded p-1 text-xs hover:bg-white/10"
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            aria-label="Move up"
          >
            ↑
          </button>
        )}
        {onMoveDown && (
          <button
            className="rounded p-1 text-xs hover:bg-white/10"
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            aria-label="Move down"
          >
            ↓
          </button>
        )}
        <button
          className="rounded p-1 text-xs hover:bg-danger/20 hover:text-danger"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label="Delete category"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
