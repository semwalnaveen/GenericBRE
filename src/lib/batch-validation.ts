import { InputMap } from "./engine";
import { BatchColumn } from "./batch-template";
import { CellScalar, ParsedWorkbook } from "./xlsx-io";

// Mirrors validation-panel.tsx's ValidationError shape (fieldKey/fieldLabel/
// message/severity) for visual consistency with the single-record Simulator,
// plus `row` (1-based data row, "Header" for structural issues) since a batch
// error table must point at a specific spreadsheet row.
export interface BatchValidationError {
  row: number | "Header";
  column: string;
  fieldKey?: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidatedBatchRow {
  rowNumber: number; // 1-based, matches the row's position among data rows (Excel row = rowNumber + 1)
  customerId: string;
  input: InputMap;
}

export interface BatchValidationResult {
  errors: BatchValidationError[];
  /** Only populated when there are zero "error"-severity issues — execution is blocked otherwise. */
  validRows: ValidatedBatchRow[] | null;
}

const TRUE_STRINGS = new Set(["true", "yes", "1"]);
const FALSE_STRINGS = new Set(["false", "no", "0"]);

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase();
}

function coerceCell(
  raw: CellScalar,
  column: BatchColumn
): { value: string | number | boolean; error?: string } {
  const str = raw === null ? "" : String(raw).trim();

  switch (column.type) {
    case "number":
    case "currency": {
      const n = typeof raw === "number" ? raw : Number(str);
      if (str === "" || Number.isNaN(n)) return { value: str, error: `Expected a number, got "${str}".` };
      return { value: n };
    }
    case "boolean": {
      if (typeof raw === "boolean") return { value: raw };
      const lower = str.toLowerCase();
      if (TRUE_STRINGS.has(lower)) return { value: true };
      if (FALSE_STRINGS.has(lower)) return { value: false };
      return { value: str, error: `Expected true/false, got "${str}".` };
    }
    case "enum": {
      const match = column.options?.find((o) => o.toLowerCase() === str.toLowerCase());
      if (!match) {
        return {
          value: str,
          error: `"${str}" is not a valid option — expected one of: ${(column.options ?? []).join(", ")}.`,
        };
      }
      return { value: match };
    }
    case "date": {
      if (!/^\d{4}-\d{2}-\d{2}/.test(str) || Number.isNaN(Date.parse(str))) {
        return { value: str, error: `Expected a date (YYYY-MM-DD), got "${str}".` };
      }
      return { value: str };
    }
    default:
      return { value: str };
  }
}

// Validates a parsed workbook against a product's Batch Testing column
// schema (see batch-template.ts): structural checks (missing/duplicate/
// unsupported columns) first, then per-cell type/required/enum checks.
// Execution stays blocked (`validRows: null`) while any "error"-severity
// issue remains — matches the spec's "block execution until valid".
export function validateBatchWorkbook(parsed: ParsedWorkbook, columns: BatchColumn[]): BatchValidationResult {
  const errors: BatchValidationError[] = [];

  const headerCounts = new Map<string, number>();
  for (const h of parsed.headers) {
    if (!h) continue;
    const key = normalizeHeader(h);
    headerCounts.set(key, (headerCounts.get(key) ?? 0) + 1);
  }
  for (const [key, count] of headerCounts) {
    if (count > 1) {
      errors.push({ row: "Header", column: key, message: `Column "${key}" appears ${count} times — remove the duplicate.`, severity: "error" });
    }
  }

  const columnByHeader = new Map(columns.map((c) => [normalizeHeader(c.label), c]));
  const uploadedHeaderSet = new Set(parsed.headers.filter(Boolean).map(normalizeHeader));
  for (const column of columns) {
    if (column.required && !uploadedHeaderSet.has(normalizeHeader(column.label))) {
      errors.push({
        row: "Header",
        column: column.label,
        fieldKey: column.key,
        message: `Required column "${column.label}" is missing from the uploaded file.`,
        severity: "error",
      });
    }
  }
  for (const h of parsed.headers) {
    if (!h) continue;
    if (!columnByHeader.has(normalizeHeader(h))) {
      errors.push({ row: "Header", column: h, message: `"${h}" is not a recognized field for this product's mapped rules — remove or rename this column.`, severity: "error" });
    }
  }

  const structuralErrors = errors.some((e) => e.severity === "error");
  const rowResults: ValidatedBatchRow[] = [];

  if (!structuralErrors) {
    parsed.rows.forEach((row, idx) => {
      const rowNumber = idx + 1;
      const input: InputMap = {};
      let customerId = "";

      for (const column of columns) {
        const matchedHeader = parsed.headers.find((h) => normalizeHeader(h) === normalizeHeader(column.label));
        const raw = matchedHeader ? row[matchedHeader] : null;

        if (column.key === "customer_id") {
          customerId = raw === null || raw === undefined ? "" : String(raw).trim();
          continue;
        }

        if (raw === null || raw === undefined || String(raw).trim() === "") {
          if (column.required) {
            errors.push({ row: rowNumber, column: column.label, fieldKey: column.key, message: `Required field "${column.label}" is empty.`, severity: "error" });
          }
          continue;
        }

        const { value, error } = coerceCell(raw, column);
        if (error) {
          errors.push({ row: rowNumber, column: column.label, fieldKey: column.key, message: error, severity: "error" });
        } else {
          input[column.key] = value;
        }
      }

      rowResults.push({ rowNumber, customerId: customerId || `ROW-${rowNumber}`, input });
    });
  }

  const hasBlockingErrors = errors.some((e) => e.severity === "error");
  return { errors, validRows: hasBlockingErrors ? null : rowResults };
}
