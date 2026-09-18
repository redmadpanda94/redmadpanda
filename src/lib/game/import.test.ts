import { describe, expect, it } from "vitest";
import { parseCsvText, validateImportRows } from "./import";

describe("validateImportRows", () => {
  it("accepts fully valid rows", () => {
    const preview = validateImportRows([
      { Category: "Movies", Points: "100", Question: "Q1", Answer: "A1" },
      { Category: "Movies", Points: "200", Question: "Q2", Answer: "A2" },
    ]);
    expect(preview.errorCount).toBe(0);
    expect(preview.validCount).toBe(2);
  });

  it("flags missing required fields with a clear message", () => {
    const preview = validateImportRows([{ Category: "Movies", Points: "100", Question: "", Answer: "A1" }]);
    expect(preview.rows[0].errors).toContain("Missing Question");
    expect(preview.errorCount).toBe(1);
  });

  it("flags non-numeric and non-positive points", () => {
    const preview = validateImportRows([
      { Category: "Movies", Points: "abc", Question: "Q", Answer: "A" },
      { Category: "Movies", Points: "-5", Question: "Q", Answer: "A" },
      { Category: "Movies", Points: "0", Question: "Q", Answer: "A" },
    ]);
    expect(preview.rows.every((r) => r.errors.some((e) => e.includes("Points")))).toBe(true);
  });

  it("is tolerant of header casing and spacing", () => {
    const preview = validateImportRows([{ category: "Movies", points: "100", question: "Q", answer: "A" }]);
    expect(preview.rows[0].errors).toHaveLength(0);
    expect(preview.rows[0].category).toBe("Movies");
  });

  it("infers media type from a YouTube URL when MediaType is omitted", () => {
    const preview = validateImportRows([
      {
        Category: "Music",
        Points: "100",
        Question: "Q",
        Answer: "A",
        MediaURL: "https://youtu.be/dQw4w9WgXcQ",
      },
    ]);
    expect(preview.rows[0].mediaType).toBe("youtube");
  });

  it("rejects an invalid MediaType", () => {
    const preview = validateImportRows([
      { Category: "Music", Points: "100", Question: "Q", Answer: "A", MediaType: "podcast" },
    ]);
    expect(preview.rows[0].errors.some((e) => e.includes("MediaType"))).toBe(true);
  });

  it("detects duplicate category/points cells across rows", () => {
    const preview = validateImportRows([
      { Category: "Movies", Points: "100", Question: "Q1", Answer: "A1" },
      { Category: "Movies", Points: "100", Question: "Q2", Answer: "A2" },
    ]);
    expect(preview.duplicateCells).toHaveLength(1);
    expect(preview.rows[0].errors.some((e) => e.includes("Duplicate cell"))).toBe(true);
    expect(preview.rows[1].errors.some((e) => e.includes("Duplicate cell"))).toBe(true);
  });

  it("assigns 1-indexed row numbers accounting for the header row", () => {
    const preview = validateImportRows([
      { Category: "Movies", Points: "100", Question: "Q1", Answer: "A1" },
      { Category: "Movies", Points: "200", Question: "Q2", Answer: "A2" },
    ]);
    expect(preview.rows[0].rowNumber).toBe(2);
    expect(preview.rows[1].rowNumber).toBe(3);
  });
});

describe("parseCsvText", () => {
  it("parses a simple CSV with headers", () => {
    const csv = "Category,Points,Question,Answer\nMovies,100,Q1,A1\nMovies,200,Q2,A2\n";
    const rows = parseCsvText(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ Category: "Movies", Points: "100", Question: "Q1", Answer: "A1" });
  });

  it("round-trips through validateImportRows", () => {
    const csv = "Category,Points,Question,Answer\nMovies,100,Q1,A1\n";
    const preview = validateImportRows(parseCsvText(csv));
    expect(preview.errorCount).toBe(0);
  });
});
