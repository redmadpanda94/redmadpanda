import Papa from "papaparse";
import type { MediaPlacement, MediaType } from "@/types/database";

export interface RawImportRow {
  [key: string]: string | number | undefined;
}

export interface ValidatedImportRow {
  rowNumber: number;
  category: string;
  points: number;
  question: string;
  answer: string;
  mediaUrl?: string;
  mediaType?: MediaType;
  mediaPlacement: MediaPlacement;
  notes?: string;
  errors: string[];
}

export interface ImportPreview {
  rows: ValidatedImportRow[];
  validCount: number;
  errorCount: number;
  duplicateCells: Array<{ category: string; points: number; rows: number[] }>;
}

const MEDIA_TYPES: MediaType[] = ["image", "gif", "youtube", "video", "audio"];
const MEDIA_PLACEMENTS: MediaPlacement[] = ["before_question", "after_question", "instead_of_question"];

function getField(row: RawImportRow, ...names: string[]): string | undefined {
  const keys = Object.keys(row);
  for (const name of names) {
    const key = keys.find((k) => k.trim().toLowerCase() === name.toLowerCase());
    if (key !== undefined) {
      const value = row[key];
      if (value === undefined || value === null) return undefined;
      const str = String(value).trim();
      return str.length ? str : undefined;
    }
  }
  return undefined;
}

/** Pure validation of already-parsed rows (no file I/O — easy to unit test). */
export function validateImportRows(rawRows: RawImportRow[]): ImportPreview {
  const rows: ValidatedImportRow[] = rawRows.map((raw, index) => {
    const errors: string[] = [];
    const category = getField(raw, "Category") ?? "";
    const pointsRaw = getField(raw, "Points");
    const question = getField(raw, "Question") ?? "";
    const answer = getField(raw, "Answer") ?? "";
    const mediaUrl = getField(raw, "MediaURL", "Media URL", "Media");
    const mediaTypeRaw = getField(raw, "MediaType", "Media Type")?.toLowerCase();
    const mediaPlacementRaw = getField(raw, "MediaPlacement", "Media Placement")
      ?.toLowerCase()
      .replace(/\s+/g, "_");
    const notes = getField(raw, "Notes");

    if (!category) errors.push("Missing Category");
    if (!question) errors.push("Missing Question");
    if (!answer) errors.push("Missing Answer");

    let points = NaN;
    if (!pointsRaw) {
      errors.push("Missing Points");
    } else {
      points = Number(pointsRaw);
      if (!Number.isFinite(points) || points <= 0 || !Number.isInteger(points)) {
        errors.push("Invalid Points (must be a positive whole number)");
      }
    }

    let mediaType: MediaType | undefined;
    if (mediaTypeRaw) {
      if ((MEDIA_TYPES as string[]).includes(mediaTypeRaw)) {
        mediaType = mediaTypeRaw as MediaType;
      } else {
        errors.push(`Invalid MediaType "${mediaTypeRaw}"`);
      }
    }
    if (mediaUrl && !mediaType) {
      mediaType = mediaUrl.includes("youtube.com") || mediaUrl.includes("youtu.be") ? "youtube" : "image";
    }

    let mediaPlacement: MediaPlacement = "after_question";
    if (mediaPlacementRaw) {
      if ((MEDIA_PLACEMENTS as string[]).includes(mediaPlacementRaw)) {
        mediaPlacement = mediaPlacementRaw as MediaPlacement;
      } else {
        errors.push(`Invalid MediaPlacement "${mediaPlacementRaw}"`);
      }
    }

    return {
      rowNumber: index + 2, // +1 for 1-index, +1 for header row
      category,
      points: Number.isFinite(points) ? points : 0,
      question,
      answer,
      mediaUrl,
      mediaType,
      mediaPlacement,
      notes,
      errors,
    };
  });

  const cellMap = new Map<string, number[]>();
  for (const row of rows) {
    if (!row.category || !row.points) continue;
    const key = `${row.category.toLowerCase()}::${row.points}`;
    const list = cellMap.get(key) ?? [];
    list.push(row.rowNumber);
    cellMap.set(key, list);
  }
  const duplicateCells = [...cellMap.entries()]
    .filter(([, rowNumbers]) => rowNumbers.length > 1)
    .map(([key, rowNumbers]) => {
      const [category, points] = key.split("::");
      return { category, points: Number(points), rows: rowNumbers };
    });

  for (const dup of duplicateCells) {
    for (const row of rows) {
      if (row.rowNumber !== -1 && dup.rows.includes(row.rowNumber) && row.category.toLowerCase() === dup.category) {
        row.errors.push(`Duplicate cell: ${dup.category} / ${dup.points} appears in rows ${dup.rows.join(", ")}`);
      }
    }
  }

  const errorCount = rows.filter((r) => r.errors.length > 0).length;

  return {
    rows,
    validCount: rows.length - errorCount,
    errorCount,
    duplicateCells,
  };
}

export function parseCsvText(text: string): RawImportRow[] {
  const result = Papa.parse<RawImportRow>(text, { header: true, skipEmptyLines: true });
  return result.data;
}
