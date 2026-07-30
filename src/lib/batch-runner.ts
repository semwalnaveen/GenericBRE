import { BusinessField, BusinessRule, DecisionOutcome, DecisionResult, ExecutionSettings, Product, ProductRuleMapping, SimulationResult } from "./types";
import { executeRulesByProduct } from "./product-rule-engine";
import { fromSimulation } from "./decision-response";
import { ValidatedBatchRow } from "./batch-validation";

export interface BatchRowResult {
  rowNumber: number;
  customerId: string;
  status: "Success" | "Error";
  outcome: DecisionOutcome | null;
  simulation: SimulationResult | null;
  decision: DecisionResult | null;
  errorMessage?: string;
  durationMs: number;
}

export interface BatchRunProgress {
  processed: number;
  total: number;
  elapsedMs: number;
}

export interface BatchRunOptions {
  /** Rows processed per macrotask tick before yielding back to the browser — keeps the UI responsive on large batches. */
  chunkSize?: number;
  onProgress?: (progress: BatchRunProgress) => void;
  /** Checked between rows; when it returns true the run stops immediately (partial results are returned). */
  shouldCancel?: () => boolean;
  /** Checked between chunks; while true the runner idles (still cancellable) instead of scheduling the next chunk. */
  isPaused?: () => boolean;
}

export interface BatchRunOutcome {
  results: BatchRowResult[];
  cancelled: boolean;
}

const DEFAULT_CHUNK_SIZE = 200;

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// Runs every validated row through the SAME product execution pipeline the
// single-record Simulator uses (executeRulesByProduct — see
// product-rule-engine.ts) — no separate rule engine. Chunked with a
// setTimeout(0) yield between batches so a 10,000-row run never blocks the
// main thread for longer than one chunk's worth of work, and a single row's
// unexpected exception is caught and recorded rather than aborting the run
// (the engine itself never throws today, but this is the batch-level safety
// net requirement #12 calls for).
export async function runBatch(
  product: Product,
  rows: ValidatedBatchRow[],
  rules: BusinessRule[],
  mappings: ProductRuleMapping[],
  fieldCatalog: BusinessField[],
  executionSettings: ExecutionSettings,
  options: BatchRunOptions = {}
): Promise<BatchRunOutcome> {
  const { chunkSize = DEFAULT_CHUNK_SIZE, onProgress, shouldCancel, isPaused } = options;
  const results: BatchRowResult[] = [];
  const startedAt = performance.now();
  let cancelled = false;

  for (let i = 0; i < rows.length; i += chunkSize) {
    if (shouldCancel?.()) {
      cancelled = true;
      break;
    }
    while (isPaused?.()) {
      if (shouldCancel?.()) {
        cancelled = true;
        break;
      }
      await yieldToBrowser();
    }
    if (cancelled) break;

    const chunk = rows.slice(i, i + chunkSize);
    for (const row of chunk) {
      results.push(executeOneRow(product, row, rules, mappings, fieldCatalog, executionSettings));
    }

    onProgress?.({ processed: Math.min(i + chunk.length, rows.length), total: rows.length, elapsedMs: performance.now() - startedAt });
    await yieldToBrowser();
  }

  return { results, cancelled };
}

function executeOneRow(
  product: Product,
  row: ValidatedBatchRow,
  rules: BusinessRule[],
  mappings: ProductRuleMapping[],
  fieldCatalog: BusinessField[],
  executionSettings: ExecutionSettings
): BatchRowResult {
  const start = performance.now();
  try {
    const execution = executeRulesByProduct(product, rules, mappings, row.input, fieldCatalog, [], executionSettings);
    if (!execution.ok || !execution.result) {
      return {
        rowNumber: row.rowNumber,
        customerId: row.customerId,
        status: "Error",
        outcome: null,
        simulation: null,
        decision: null,
        errorMessage: execution.reason ?? "Execution failed.",
        durationMs: performance.now() - start,
      };
    }
    const simulation = execution.result;
    return {
      rowNumber: row.rowNumber,
      customerId: row.customerId,
      status: "Success",
      outcome: simulation.outcome,
      simulation,
      decision: fromSimulation(simulation, rules),
      durationMs: performance.now() - start,
    };
  } catch (err) {
    return {
      rowNumber: row.rowNumber,
      customerId: row.customerId,
      status: "Error",
      outcome: null,
      simulation: null,
      decision: null,
      errorMessage: err instanceof Error ? err.message : "Unexpected error during execution.",
      durationMs: performance.now() - start,
    };
  }
}
