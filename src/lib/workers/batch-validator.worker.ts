import { parseXlsxFile } from "../xlsx-io";
import { validateBatchWorkbook, BatchValidationResult } from "../batch-validation";
import { BatchColumn } from "../batch-template";

export interface BatchWorkerMessage {
  file: File;
  columns: BatchColumn[];
  maxSizeBytes: number;
}

export type BatchWorkerResponse = 
  | { type: 'success'; result: BatchValidationResult }
  | { type: 'error'; message: string };

self.addEventListener("message", async (e: MessageEvent<BatchWorkerMessage>) => {
  try {
    const { file, columns, maxSizeBytes } = e.data;
    
    // Parse the file
    const parsed = await parseXlsxFile(file, maxSizeBytes);
    
    // Validate rows
    const result = validateBatchWorkbook(parsed, columns);
    
    // Send back the validation result
    self.postMessage({ type: 'success', result });
  } catch (err) {
    self.postMessage({ 
      type: 'error', 
      message: err instanceof Error ? err.message : "Could not read this file — is it a valid .xlsx/.xls workbook?" 
    });
  }
});
