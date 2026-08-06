"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Download, Search, CheckCircle2, XCircle } from "lucide-react";
import { BatchRowResult } from "@/lib/batch-runner";
import { downloadCsv } from "@/lib/csv";
import { downloadResultsWorkbook } from "@/lib/xlsx-io";
import { OutcomeBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/repository/data-table";

function SortHeader({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 hover:text-foreground transition-colors">
      {label}
      <ArrowUpDown className="size-3" />
    </button>
  );
}

const STATUS_OPTIONS = [
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
  { value: "Review Required", label: "Review Required" },
  { value: "Error", label: "Execution Error" },
];

function buildColumns(onRowClick: (row: BatchRowResult) => void): ColumnDef<BatchRowResult>[] {
  return [
    {
      accessorKey: "rowNumber",
      header: ({ column }) => <SortHeader label="Row #" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />,
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.rowNumber}</span>,
      size: 70,
    },
    {
      accessorKey: "customerId",
      header: ({ column }) => <SortHeader label="Customer ID" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />,
      cell: ({ row }) => (
        <button onClick={() => onRowClick(row.original)} className="text-left font-medium hover:text-primary hover:underline text-xs">
          {row.original.customerId}
        </button>
      ),
      size: 130,
    },
    {
      id: "status",
      header: "Execution Status",
      cell: ({ row }) =>
        row.original.status === "Success" ? (
          <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="size-3.5" /> Success
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-destructive font-medium">
            <XCircle className="size-3.5" /> Error
          </span>
        ),
      size: 110,
      filterFn: (row, _id, filterValue: string[]) => {
        if (!filterValue?.length) return true;
        if (row.original.status === "Error") return filterValue.includes("Error");
        return !!row.original.outcome && filterValue.includes(row.original.outcome);
      },
    },
    {
      id: "decision",
      header: "Final Decision",
      cell: ({ row }) => (row.original.outcome ? <OutcomeBadge outcome={row.original.outcome} className="text-xs" /> : <span className="text-xs text-muted-foreground/50">—</span>),
      size: 120,
    },
    {
      id: "triggeredRules",
      header: "Triggered Rules",
      cell: ({ row }) => {
        const d = row.original.decision;
        if (!d) return <span className="text-xs text-muted-foreground/50">—</span>;
        return <span className="text-xs font-mono">{d.triggeredRules.length}/{d.flatTrace.length}</span>;
      },
      size: 110,
    },
    {
      accessorKey: "durationMs",
      header: ({ column }) => <SortHeader label="Execution Time" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />,
      cell: ({ row }) => <span className="text-xs font-mono">{row.original.durationMs.toFixed(1)}ms</span>,
      size: 100,
    },
    {
      id: "variables",
      header: "Variables Generated",
      cell: ({ row }) => <span className="text-xs font-mono">{Object.keys(row.original.decision?.calculatedValues ?? {}).length}</span>,
      size: 130,
    },
    {
      id: "errors",
      header: "Error Count",
      cell: ({ row }) => (
        <span className={row.original.status === "Error" ? "text-xs font-semibold text-destructive" : "text-xs text-muted-foreground"}>
          {row.original.status === "Error" ? 1 : 0}
        </span>
      ),
      size: 90,
    },
    {
      id: "reason",
      header: "Decision Reason",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground truncate block max-w-[200px]" title={row.original.decision?.summary ?? row.original.errorMessage ?? "—"}>
          {row.original.decision?.summary ?? row.original.errorMessage ?? "—"}
        </span>
      ),
      // No fixed size so it absorbs the remaining space
    },
  ];
}

export function BatchResultsGrid({
  results,
  productName,
  onRowClick,
}: {
  results: BatchRowResult[];
  productName: string;
  onRowClick: (row: BatchRowResult) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  const columns = useMemo(() => buildColumns(onRowClick), [onRowClick]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return results.filter((r) => {
      if (q && !r.customerId.toLowerCase().includes(q) && !String(r.rowNumber).includes(q)) return false;
      if (statusFilter.length > 0) {
        const key = r.status === "Error" ? "Error" : r.outcome ?? "";
        if (!statusFilter.includes(key)) return false;
      }
      return true;
    });
  }, [results, search, statusFilter]);

  const exportRows = (fmt: "csv" | "xlsx") => {
    const headers = ["Row", "Customer ID", "Status", "Final Decision", "Triggered Rules", "Execution Time (ms)", "Variables Generated", "Error Count", "Decision Reason"];
    const rows = filtered.map((r) => [
      r.rowNumber,
      r.customerId,
      r.status,
      r.outcome ?? "",
      r.decision ? `${r.decision.triggeredRules.length}/${r.decision.flatTrace.length}` : "",
      Number(r.durationMs.toFixed(2)),
      Object.keys(r.decision?.calculatedValues ?? {}).length,
      r.status === "Error" ? 1 : 0,
      r.decision?.summary ?? r.errorMessage ?? "",
    ]);
    if (fmt === "csv") {
      downloadCsv(
        `batch_results_${productName.replace(/\s+/g, "_")}`,
        rows.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]])))
      );
    } else {
      downloadResultsWorkbook(`batch_results_${productName.replace(/\s+/g, "_")}`, headers, rows);
    }
  };

  return (
    <DataTable
      className="h-auto max-h-[360px]"
      columns={columns}
      data={filtered}
      getRowId={(r) => String(r.rowNumber)}
      leftToolbar={
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-40">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer ID or row #..."
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>
          <MultiSelect label="Status" options={STATUS_OPTIONS} selected={statusFilter} onChange={setStatusFilter} className="h-8 text-xs" />
          {statusFilter.length > 0 && (
            <Badge variant="secondary" className="h-6 text-xs">{filtered.length} of {results.length} rows</Badge>
          )}
        </div>
      }
      rightToolbar={
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" />}>
            <Download className="size-3.5" /> Export
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportRows("csv")}>Export as CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportRows("xlsx")}>Export as Excel (.xlsx)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    />
  );
}
