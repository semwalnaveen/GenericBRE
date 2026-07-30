"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  X,
  PlayCircle,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { useAppStore, useHasCapability } from "@/lib/store";
import { Product } from "@/lib/types";
import { getTemplateColumns, buildSampleRow } from "@/lib/batch-template";
import { validateBatchWorkbook, BatchValidationResult } from "@/lib/batch-validation";
import { downloadTemplateWorkbook, downloadResultsWorkbook, DEFAULT_MAX_FILE_SIZE_BYTES } from "@/lib/xlsx-io";
import { downloadCsv } from "@/lib/csv";
import { runBatch, BatchRowResult, BatchRunProgress } from "@/lib/batch-runner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProductSelector } from "../product-selector";
import { BatchProgressBar } from "./batch-progress-bar";
import { BatchResultsGrid } from "./batch-results-grid";
import { BatchRowDetailSheet } from "./batch-row-detail-sheet";
import { BatchSummaryDashboard } from "./batch-summary-dashboard";

type Phase = "idle" | "validating" | "ready" | "running" | "done";

const REPORT_HEADERS = [
  "Customer ID",
  "Status",
  "Pass/Fail",
  "Triggered Rules",
  "Final Decision",
  "Decision Reason",
  "Execution Time (ms)",
  "Errors",
  "Warnings",
  "Variables Generated",
];

export function BatchTestingPanel({ products, initialProduct }: { products: Product[]; initialProduct: Product }) {
  const rules = useAppStore((s) => s.rules);
  const productRuleMappings = useAppStore((s) => s.productRuleMappings);
  const fieldCatalog = useAppStore((s) => s.fieldCatalog);
  const executionSettings = useAppStore((s) => s.executionSettings);
  const currentUser = useAppStore((s) => s.currentUser);
  const logAudit = useAppStore((s) => s.logAudit);
  const addBatchRunSummary = useAppStore((s) => s.addBatchRunSummary);
  const markBatchReportDownloaded = useAppStore((s) => s.markBatchReportDownloaded);
  const canRun = useHasCapability("rule.simulate");

  const [product, setProduct] = useState(initialProduct);
  const [file, setFile] = useState<File | null>(null);
  const [uploadedAt, setUploadedAt] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [validation, setValidation] = useState<BatchValidationResult | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState<BatchRunProgress | null>(null);
  const [paused, setPaused] = useState(false);
  const [results, setResults] = useState<BatchRowResult[]>([]);
  const [cancelled, setCancelled] = useState(false);
  const [selectedRow, setSelectedRow] = useState<BatchRowResult | null>(null);
  const [batchRunId, setBatchRunId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const cancelRef = useRef(false);
  const pausedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const columns = useMemo(
    () => getTemplateColumns(product, rules, productRuleMappings, fieldCatalog),
    [product, rules, productRuleMappings, fieldCatalog]
  );

  const resetAll = () => {
    setFile(null);
    setUploadedAt(null);
    setParseError(null);
    setValidation(null);
    setPhase("idle");
    setProgress(null);
    setPaused(false);
    setResults([]);
    setCancelled(false);
    setBatchRunId(null);
    cancelRef.current = false;
    pausedRef.current = false;
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    resetAll();
  }, [product.id]);

  const handleDownloadTemplate = () => {
    downloadTemplateWorkbook(`batch_template_${product.code}`, columns.map((c) => c.label), buildSampleRow(columns));
    toast.success("Sample template downloaded");
  };

  const handleFile = (f: File) => {
    resetAll();
    setFile(f);
    setUploadedAt(new Date().toISOString());
    setPhase("validating");
    
    // Process file off the main thread to prevent UI freezing
    const worker = new Worker(new URL("@/lib/workers/batch-validator.worker.ts", import.meta.url));
    
    worker.onmessage = (e) => {
      const data = e.data;
      if (data.type === 'success') {
        setValidation(data.result);
        setPhase("ready");
      } else {
        setParseError(data.message);
        setPhase("idle");
      }
      worker.terminate();
    };
    
    worker.onerror = () => {
      setParseError("A fatal error occurred during validation.");
      setPhase("idle");
      worker.terminate();
    };
    
    worker.postMessage({ file: f, columns, maxSizeBytes: DEFAULT_MAX_FILE_SIZE_BYTES });
  };

  const handleRun = async () => {
    if (!validation?.validRows || validation.validRows.length === 0) return;
    setPhase("running");
    setResults([]);
    setCancelled(false);
    cancelRef.current = false;
    pausedRef.current = false;
    setPaused(false);
    const startedAt = new Date().toISOString();

    const outcome = await runBatch(
      product,
      validation.validRows,
      rules,
      productRuleMappings,
      fieldCatalog,
      executionSettings[product.domain] ?? executionSettings.default ?? { conflictResolution: "execute-all" },
      {
        onProgress: setProgress,
        shouldCancel: () => cancelRef.current,
        isPaused: () => pausedRef.current,
      }
    );

    const endedAt = new Date().toISOString();
    setResults(outcome.results);
    setCancelled(outcome.cancelled);
    setPhase("done");

    const passed = outcome.results.filter((r) => r.status === "Success" && r.outcome === "Approved").length;
    const failed = outcome.results.filter((r) => r.status === "Success" && r.outcome === "Rejected").length;
    const avgExecutionMs = outcome.results.length
      ? outcome.results.reduce((sum, r) => sum + r.durationMs, 0) / outcome.results.length
      : 0;

    const id = addBatchRunSummary({
      productId: product.id,
      productName: product.name,
      fileName: file?.name ?? "batch_upload.xlsx",
      uploadedBy: currentUser.name,
      startedAt,
      endedAt,
      totalRows: outcome.results.length,
      passed,
      failed,
      cancelled: outcome.cancelled,
      avgExecutionMs,
      reportDownloaded: false,
    });
    setBatchRunId(id);

    logAudit({
      user: currentUser.name,
      action: "Ran Batch Test",
      entity: "Product",
      entityId: product.id,
      details: `Batch test on "${product.name}" — ${outcome.results.length} rows (${passed} approved, ${failed} rejected)${outcome.cancelled ? ", cancelled early" : ""}.`,
    });

    if (outcome.cancelled) {
      toast.warning("Batch run cancelled", { description: `${outcome.results.length} of ${validation.validRows.length} rows were processed.` });
    } else {
      toast.success("Batch run complete", { description: `${outcome.results.length} rows processed — ${passed} approved, ${failed} rejected.` });
    }
  };

  const handleCancel = () => {
    cancelRef.current = true;
  };

  const handleTogglePause = () => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  };

  const handleDownloadReport = (fmt: "csv" | "xlsx") => {
    const rows = results.map((r) => [
      r.customerId,
      r.status,
      r.status === "Success" ? (r.outcome === "Approved" ? "Pass" : "Fail") : "Fail",
      r.decision ? r.decision.triggeredRules.join("; ") : "",
      r.outcome ?? "",
      r.decision?.summary ?? r.errorMessage ?? "",
      Number(r.durationMs.toFixed(2)),
      r.status === "Error" ? 1 : 0,
      r.outcome === "Review Required" ? 1 : 0,
      Object.keys(r.decision?.calculatedValues ?? {}).length,
    ]);
    if (fmt === "csv") {
      downloadCsv(`batch_report_${product.code}`, rows.map((r) => Object.fromEntries(REPORT_HEADERS.map((h, i) => [h, r[i]]))));
    } else {
      downloadResultsWorkbook(`batch_report_${product.code}`, REPORT_HEADERS, rows);
    }
    if (batchRunId) markBatchReportDownloaded(batchRunId);
    toast.success(`Report downloaded (${fmt.toUpperCase()})`);
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const blockingErrors = validation?.errors.filter((e) => e.severity === "error") ?? [];
  const hasBlockingErrors = blockingErrors.length > 0;

  if (!canRun) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle />
        <AlertTitle>No access to Batch Testing</AlertTitle>
        <AlertDescription>Your account doesn&apos;t have Simulate access for this product. Contact an administrator to request access.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto bg-background p-4 sm:p-5">
      <ProductSelector
        products={products}
        selectedProduct={product}
        onSelectProduct={setProduct}
        mappedRuleCount={columns.length - 1}
      />

      {phase !== "done" && (
        <div className="rounded-xl border bg-card p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-foreground">Upload Batch File</h3>
              <p className="text-sm text-muted-foreground">
                One row per customer request — executed through {product.name}&apos;s mapped rule pipeline ({columns.length - 1} required field{columns.length - 1 === 1 ? "" : "s"}).
              </p>
            </div>
            <Button variant="outline" size="sm" className="h-8 shrink-0 gap-1.5 text-sm" onClick={handleDownloadTemplate}>
              <Download className="size-3.5" /> Download Sample Template
            </Button>
          </div>

          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFileInputChange} />

          {!file ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-accent/30"
              }`}
            >
              <UploadCloud className="size-8 text-muted-foreground/60" />
              <p className="text-sm font-medium text-foreground">Drag &amp; drop .xlsx / .xls, or click to browse</p>
              <p className="text-sm text-muted-foreground">Max file size: {Math.round(DEFAULT_MAX_FILE_SIZE_BYTES / (1024 * 1024))} MB</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 p-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <FileSpreadsheet className="size-5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground" title={file.name}>{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {phase === "validating"
                        ? "Validating…"
                        : `${validation?.validRows?.length ?? 0} rows · uploaded ${uploadedAt ? new Date(uploadedAt).toLocaleTimeString() : ""} by ${currentUser.name}`}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {phase === "validating" ? (
                    <Badge variant="secondary" className="gap-1"><Loader2 className="size-3 animate-spin" /> Validating</Badge>
                  ) : hasBlockingErrors ? (
                    <Badge variant="destructive" className="gap-1"><AlertCircle className="size-3" /> {blockingErrors.length} Error{blockingErrors.length === 1 ? "" : "s"}</Badge>
                  ) : (
                    <Badge className="gap-1 bg-emerald-500 text-white"><CheckCircle2 className="size-3" /> Valid</Badge>
                  )}
                  <Button variant="outline" size="sm" className="h-8 text-sm" onClick={() => fileInputRef.current?.click()}>Replace</Button>
                  <Button variant="ghost" size="icon-sm" onClick={resetAll} title="Remove file"><X className="size-4" /></Button>
                </div>
              </div>

              {parseError && (
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertTitle>Couldn&apos;t read this file</AlertTitle>
                  <AlertDescription>{parseError}</AlertDescription>
                </Alert>
              )}

              {validation && validation.errors.length > 0 && (
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
                    <AlertCircle className="size-3.5" /> {blockingErrors.length} issue{blockingErrors.length === 1 ? "" : "s"} must be fixed before running — showing all {validation.errors.length}.
                  </p>
                  <div className="max-h-56 overflow-y-auto rounded-lg border">
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-muted text-sm font-semibold text-muted-foreground">
                        <tr>
                          <th className="p-2">Row</th>
                          <th className="p-2">Column</th>
                          <th className="p-2">Issue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {validation.errors.map((e, i) => (
                          <tr key={i} className={e.severity === "error" ? "bg-destructive/5" : "bg-amber-500/5"}>
                            <td className="p-2 font-mono text-sm">{e.row}</td>
                            <td className="p-2 font-medium text-sm">{e.column}</td>
                            <td className="p-2 text-sm text-muted-foreground">{e.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {!hasBlockingErrors && phase === "ready" && (
                <Button className="h-9 w-full gap-1.5 text-sm font-bold shadow-sm" onClick={handleRun}>
                  <PlayCircle className="size-4" /> Run Batch Test
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {phase === "running" && progress && (
        <BatchProgressBar
          processed={progress.processed}
          total={progress.total}
          elapsedMs={progress.elapsedMs}
          paused={paused}
          onTogglePause={handleTogglePause}
          onCancel={handleCancel}
        />
      )}

      {phase === "done" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Batch Results — {product.name}
                {cancelled && <Badge variant="secondary" className="ml-2 text-sm">Cancelled early</Badge>}
              </h3>
              <p className="text-sm text-muted-foreground">{file?.name} · {results.length} rows processed</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-sm" onClick={resetAll}>
                <RotateCcw className="size-3.5" /> New Batch Run
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button size="sm" className="h-8 gap-1.5 text-sm" />}>
                  <Download className="size-3.5" /> Download Report
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleDownloadReport("xlsx")}>Excel (.xlsx)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownloadReport("csv")}>CSV</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <BatchSummaryDashboard results={results} rules={rules} />
          <BatchResultsGrid results={results} productName={product.name} onRowClick={setSelectedRow} />
        </div>
      )}

      <BatchRowDetailSheet row={selectedRow} rules={rules} domain={product.domain} open={!!selectedRow} onOpenChange={(v) => !v && setSelectedRow(null)} />
    </div>
  );
}
