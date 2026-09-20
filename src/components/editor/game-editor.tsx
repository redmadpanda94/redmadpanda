"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEFAULT_GAME_SETTINGS, type GameRow } from "@/types/database";
import type { CategoryWithQuestions, QuestionWithMedia } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { friendlyError, useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-provider";
import { CategoryList } from "./category-list";
import { QuestionGrid } from "./question-grid";
import { QuestionPanel } from "./question-panel";
import { ImportModal } from "./import-modal";
import { GameSettingsPanel } from "./game-settings-panel";

export function GameEditor({ game, initialCategories }: { game: GameRow; initialCategories: CategoryWithQuestions[] }) {
  const [title, setTitle] = useState(game.title);
  // Merged with defaults so a game saved before a settings field existed
  // (e.g. incorrectPenalty) still gets a valid value.
  const [settings, setSettings] = useState({ ...DEFAULT_GAME_SETTINGS, ...game.settings });
  const [categories, setCategories] = useState(initialCategories);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(initialCategories[0]?.id ?? null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [, startTransition] = useTransition();
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? null;
  const selectedQuestion = useMemo(
    () => selectedCategory?.questions.find((q) => q.id === selectedQuestionId) ?? null,
    [selectedCategory, selectedQuestionId]
  );

  function updateCategory(id: string, patch: Partial<CategoryWithQuestions>) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function updateQuestion(categoryId: string, questionId: string, patch: Partial<QuestionWithMedia>) {
    setCategories((prev) =>
      prev.map((c) =>
        c.id !== categoryId
          ? c
          : { ...c, questions: c.questions.map((q) => (q.id === questionId ? { ...q, ...patch } : q)) }
      )
    );
  }

  async function saveTitle() {
    if (title === game.title) return;
    try {
      const res = await fetch(`/api/games/${game.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    } catch (err) {
      toast.show(friendlyError(err), "error");
    }
  }

  async function addCategory() {
    try {
      const res = await fetch(`/api/games/${game.id}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Category ${categories.length + 1}` }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      const newCategory: CategoryWithQuestions = { ...body.category, questions: [] };
      setCategories((prev) => [...prev, newCategory]);
      setSelectedCategoryId(newCategory.id);
    } catch (err) {
      toast.show(friendlyError(err), "error");
    }
  }

  async function removeCategory(id: string) {
    const ok = await confirm({
      title: "Delete this category?",
      description: "All questions and media inside it will be deleted too.",
      tone: "danger",
      confirmLabel: "Delete category",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      if (selectedCategoryId === id) setSelectedCategoryId(null);
    } catch (err) {
      toast.show(friendlyError(err), "error");
    }
  }

  async function renameCategory(id: string, name: string) {
    updateCategory(id, { name });
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    } catch (err) {
      toast.show(friendlyError(err), "error");
    }
  }

  function moveCategory(id: string, direction: -1 | 1) {
    const index = categories.findIndex((c) => c.id === id);
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    const reordered = [...categories];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setCategories(reordered);
    reordered.forEach((c, i) => {
      if (c.position !== i) {
        fetch(`/api/categories/${c.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: i }),
        }).catch(() => {});
      }
    });
  }

  async function addQuestion(categoryId: string, points: number) {
    try {
      const res = await fetch(`/api/categories/${categoryId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points, questionText: "", answerText: "" }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      const newQuestion: QuestionWithMedia = { ...body.question, media: [] };
      setCategories((prev) =>
        prev.map((c) => (c.id === categoryId ? { ...c, questions: [...c.questions, newQuestion] } : c))
      );
      setSelectedQuestionId(newQuestion.id);
    } catch (err) {
      toast.show(friendlyError(err), "error");
    }
  }

  async function duplicateQuestion(categoryId: string, question: QuestionWithMedia) {
    try {
      const res = await fetch(`/api/categories/${categoryId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          points: question.points,
          questionText: question.question_text,
          answerText: question.answer_text,
          notes: question.notes ?? undefined,
          mediaPlacement: question.media_placement,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      const newQuestion: QuestionWithMedia = { ...body.question, media: [] };
      setCategories((prev) =>
        prev.map((c) => (c.id === categoryId ? { ...c, questions: [...c.questions, newQuestion] } : c))
      );
      toast.show("Question duplicated.", "success");
    } catch (err) {
      toast.show(friendlyError(err), "error");
    }
  }

  async function removeQuestion(categoryId: string, questionId: string) {
    const ok = await confirm({ title: "Delete this question?", tone: "danger", confirmLabel: "Delete" });
    if (!ok) return;
    try {
      const res = await fetch(`/api/questions/${questionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      setCategories((prev) =>
        prev.map((c) => (c.id === categoryId ? { ...c, questions: c.questions.filter((q) => q.id !== questionId) } : c))
      );
      if (selectedQuestionId === questionId) setSelectedQuestionId(null);
    } catch (err) {
      toast.show(friendlyError(err), "error");
    }
  }

  function startSession() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/games/${game.id}/sessions`, { method: "POST" });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error);
        router.push(`/play/${body.session.id}`);
      } catch (err) {
        toast.show(friendlyError(err), "error");
      }
    });
  }

  const totalQuestions = categories.reduce((sum, c) => sum + c.questions.length, 0);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background-elevated/60 px-5 py-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-muted hover:text-foreground">
            ← Library
          </Link>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            className="w-64 border-transparent bg-transparent px-1 text-lg font-display font-semibold hover:border-border focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">{totalQuestions} questions</span>
          <Button variant="secondary" onClick={() => setShowSettings(true)}>
            ⚙ Settings
          </Button>
          <Button variant="secondary" onClick={() => setShowImport(true)}>
            Import CSV/Excel
          </Button>
          <a href={`/api/games/${game.id}/export`} download>
            <Button variant="secondary">⬇ Export CSV</Button>
          </a>
          <Link href={`/games/${game.id}/preview`}>
            <Button variant="secondary">Preview</Button>
          </Link>
          <Button variant="accent" onClick={startSession}>
            ▶ Play
          </Button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[260px_1fr_360px]">
        <CategoryList
          categories={categories}
          selectedId={selectedCategoryId}
          onSelect={(id) => {
            setSelectedCategoryId(id);
            setSelectedQuestionId(null);
          }}
          onAdd={addCategory}
          onRename={renameCategory}
          onRemove={removeCategory}
          onMove={moveCategory}
        />

        {selectedCategory ? (
          <QuestionGrid
            category={selectedCategory}
            selectedQuestionId={selectedQuestionId}
            onSelectQuestion={setSelectedQuestionId}
            onAddQuestion={(points) => addQuestion(selectedCategory.id, points)}
            onDuplicateQuestion={(q) => duplicateQuestion(selectedCategory.id, q)}
            onRemoveQuestion={(id) => removeQuestion(selectedCategory.id, id)}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center p-10 text-center text-sm text-muted">
            Create a category on the left to start adding questions.
          </div>
        )}

        <div className="border-l border-border">
          {selectedQuestion && selectedCategory ? (
            <QuestionPanel
              key={selectedQuestion.id}
              question={selectedQuestion}
              onChange={(patch) => updateQuestion(selectedCategory.id, selectedQuestion.id, patch)}
              onDelete={() => removeQuestion(selectedCategory.id, selectedQuestion.id)}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted">
              Select a question to edit its text, answer, and media.
            </div>
          )}
        </div>
      </div>

      {showImport && (
        <ImportModal
          gameId={game.id}
          onClose={() => setShowImport(false)}
          onImported={(newCategories) => {
            setCategories((prev) => mergeImportedCategories(prev, newCategories));
            setShowImport(false);
            toast.show("Import complete.", "success");
          }}
        />
      )}

      {showSettings && (
        <GameSettingsPanel
          gameId={game.id}
          settings={settings}
          onChange={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

function mergeImportedCategories(
  prev: CategoryWithQuestions[],
  incoming: CategoryWithQuestions[]
): CategoryWithQuestions[] {
  const byId = new Map(prev.map((c) => [c.id, c]));
  for (const cat of incoming) {
    const existing = byId.get(cat.id);
    if (existing) {
      byId.set(cat.id, { ...existing, questions: [...existing.questions, ...cat.questions] });
    } else {
      byId.set(cat.id, cat);
    }
  }
  return [...byId.values()];
}
