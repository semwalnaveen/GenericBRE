// Thin wrapper around the two spreadsheet libraries used by Batch Testing
// (read-excel-file / write-excel-file — chosen over SheetJS's `xlsx` package,
// which is stuck at a version with known high-severity CVEs on npm with no
// fix available). Isolating both here keeps the rest of the batch pipeline
// free of any third-party spreadsheet-library specifics.
import { readSheet } from "read-excel-file/browser";
import writeXlsxFile from "write-excel-file/browser";
import type { Row as WriteRow, Cell as WriteCell } from "write-excel-file/browser";

export type CellScalar = string | number | boolean | null;

export interface ParsedWorkbook {
  /** Raw header cell text, left-to-right, exactly as it appears in row 1. */
  headers: string[];
  /** One object per non-blank data row, keyed by header text (not normalized). */
  rows: Record<string, CellScalar>[];
}

export const DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB — matches requirement #3's "max configurable size"

// Parses an uploaded .xlsx/.xls File into header + row objects. Dates come
// back as ISO "YYYY-MM-DD" strings (matching how FieldDataType "date" values
// are represented everywhere else in this app — see engine.ts's coerceComparable).
export async function parseXlsxFile(
  file: File,
  maxSizeBytes: number = DEFAULT_MAX_FILE_SIZE_BYTES
): Promise<ParsedWorkbook> {
  if (file.size > maxSizeBytes) {
    throw new Error(`File exceeds the maximum allowed size of ${Math.round(maxSizeBytes / (1024 * 1024))} MB.`);
  }
  const data = await readSheet(file);
  if (data.length === 0) return { headers: [], rows: [] };

  const headers = (data[0] ?? []).map((cell) => String(cell ?? "").trim());
  const rows = data
    .slice(1)
    .filter((row) => row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== ""))
    .map((row) => {
      const obj: Record<string, CellScalar> = {};
      headers.forEach((header, i) => {
        if (!header) return;
        const cell: unknown = row[i];
        if (cell === null || cell === undefined) obj[header] = null;
        else if (cell instanceof Date) obj[header] = cell.toISOString().slice(0, 10);
        else obj[header] = cell as string | number | boolean;
      });
      return obj;
    });

  return { headers, rows };
}

function headerCell(label: string): WriteCell {
  return { value: label, type: String, fontWeight: "bold", backgroundColor: "#E2E8F0" };
}

function dataCell(value: CellScalar): WriteCell {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return { value, type: Boolean };
  if (typeof value === "number") return { value, type: Number };
  return { value: String(value), type: String };
}

// Downloads a per-product input template — one header column per required
// field, plus one optional example row to show the expected shape.
export async function downloadTemplateWorkbook(
  filename: string,
  headers: string[],
  sampleRow?: CellScalar[]
): Promise<void> {
  const rows: WriteRow[] = [headers.map(headerCell)];
  if (sampleRow) rows.push(sampleRow.map(dataCell));
  const blob = await writeXlsxFile(rows).toBlob();
  downloadBlob(filename, blob);
}

// Downloads a results/report workbook — one header row plus one row per
// batch record, columns supplied by the caller (see batch report builder).
export async function downloadResultsWorkbook(
  filename: string,
  headers: string[],
  rows: CellScalar[][]
): Promise<void> {
  const sheetRows: WriteRow[] = [headers.map(headerCell), ...rows.map((r) => r.map(dataCell))];
  const blob = await writeXlsxFile(sheetRows).toBlob();
  downloadBlob(filename, blob);
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `${filename}_${stamp}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
