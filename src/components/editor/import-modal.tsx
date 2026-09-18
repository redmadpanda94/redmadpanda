"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { friendlyError, useToast } from "@/components/ui/toast";
import type { ImportPreview } from "@/lib/game/import";
import type { CategoryWithQuestions } from "./types";

export function ImportModal({
  gameId,
  onClose,
  onImported,
}: {
  gameId: string;
  onClose: () => void;
  onImported: (categories: CategoryWithQuestions[]) => void;
}) {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [pending, setPending] = useState(false);
  const toast = useToast();

  async function loadPreview(selected: File) {
    setPending(true);
    setPreview(null);
    try {
      const form = new FormData();
      form.append("file", selected);
      const res = await fetch(`/api/games/${gameId}/import/preview`, { method: "POST", body: form });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setPreview(body);
    } catch (err) {
      toast.show(friendlyError(err), "error");
    } finally {
      setPending(false);
    }
  }

  async function commit() {
    if (!preview) return;
    const validRows = preview.rows.filter((r) => r.errors.length === 0);
    if (validRows.length === 0) {
      toast.show("No valid rows to import.", "error");
      return;
    }
    setPending(true);
    try {
      const res = await fetch(`/api/games/${gameId}/import/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validRows }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      onImported(body.categories as CategoryWithQuestions[]);
    } catch (err) {
      toast.show(friendlyError(err), "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
      <Card className="w-full max-w-2xl animate-reveal max-h-[85vh] overflow-hidden flex flex-col">
        <CardBody className="overflow-y-auto">
          <h2 className="font-display text-xl font-semibold">Import questions</h2>
          <p className="mt-1 text-sm text-muted">
            CSV or Excel (.xlsx) with columns: Category, Points, Question, Answer, and optionally MediaURL, MediaType, MediaPlacement, Notes.
          </p>

          <div className="mt-4">
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) loadPreview(f);
              }}
              className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-primary-hover"
            />
          </div>

          {pending && !preview && <p className="mt-4 text-sm text-primary">Reading file…</p>}

          {preview && (
            <div className="mt-5">
              <div className="mb-3 flex gap-3 text-sm">
                <Badge tone="neutral">Rows: {preview.rows.length}</Badge>
                <Badge tone="success">Valid: {preview.validCount}</Badge>
                <Badge tone={preview.errorCount > 0 ? "danger" : "neutral"}>Errors: {preview.errorCount}</Badge>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-background-elevated text-muted">
                    <tr>
                      <th className="px-2 py-1.5">Row</th>
                      <th className="px-2 py-1.5">Category</th>
                      <th className="px-2 py-1.5">Points</th>
                      <th className="px-2 py-1.5">Question</th>
                      <th className="px-2 py-1.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row) => (
                      <tr key={row.rowNumber} className={row.errors.length ? "bg-danger/5" : ""}>
                        <td className="px-2 py-1.5 text-muted">{row.rowNumber}</td>
                        <td className="px-2 py-1.5">{row.category || "—"}</td>
                        <td className="px-2 py-1.5">{row.points || "—"}</td>
                        <td className="max-w-[200px] truncate px-2 py-1.5">{row.question || "—"}</td>
                        <td className="px-2 py-1.5">
                          {row.errors.length ? (
                            <span className="text-danger" title={row.errors.join("; ")}>
                              {row.errors[0]}
                            </span>
                          ) : (
                            <span className="text-success">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={!preview || preview.validCount === 0 || pending} onClick={commit}>
              {pending ? "Importing…" : `Import ${preview?.validCount ?? 0} question${preview?.validCount === 1 ? "" : "s"}`}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
