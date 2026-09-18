import "server-only";
import ExcelJS from "exceljs";
import type { RawImportRow } from "./import";

/** Reads the first worksheet of an .xlsx file into header-keyed row objects. */
export async function parseXlsxBuffer(buffer: ArrayBuffer): Promise<RawImportRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = String(cell.value ?? "").trim();
  });

  const rows: RawImportRow[] = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    if (row.cellCount === 0) continue;
    const record: RawImportRow = {};
    let hasValue = false;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber];
      if (!header) return;
      const value = cell.value;
      if (value !== null && value !== undefined && value !== "") hasValue = true;
      record[header] = typeof value === "object" && value !== null && "text" in value
        ? String((value as { text: unknown }).text)
        : (value as string | number | undefined);
    });
    if (hasValue) rows.push(record);
  }

  return rows;
}
