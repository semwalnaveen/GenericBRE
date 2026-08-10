"use client";

import {
  ColumnDef,
  ColumnFiltersState,
  RowSelectionState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Columns3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  getRowId?: (row: TData) => string;
  onSelectionChange?: (rows: TData[]) => void;
  /** Bump this (e.g. a counter) to clear the current row selection imperatively — used after a bulk action completes. */
  resetSelectionSignal?: number;
  toolbar?: React.ReactNode;
  leftToolbar?: React.ReactNode;
  rightToolbar?: React.ReactNode;
  renderTopToolbar?: (table: any) => React.ReactNode;
  className?: string;
  emptyMessage?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  getRowId,
  onSelectionChange,
  resetSelectionSignal,
  toolbar,
  leftToolbar,
  rightToolbar,
  renderTopToolbar,
  className,
  emptyMessage = "No rules match the current filters.",
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  useEffect(() => {
    setRowSelection({});
  }, [resetSelectionSignal]);

  const table = useReactTable({
    data,
    columns,
    getRowId,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: { sorting, columnFilters, columnVisibility, rowSelection },
    initialState: { pagination: { pageSize: 6 } },
  });

  useEffect(() => {
    onSelectionChange?.(table.getSelectedRowModel().rows.map((r) => r.original));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowSelection]);

  return (
    <>
      {renderTopToolbar?.(table)}
      <div className={cn("flex min-h-0 shrink flex-col overflow-hidden rounded-xl border bg-card shadow-sm", className)}>
        <div className="min-h-0 flex-1 overflow-hidden [&_[data-slot=table-container]]:h-full [&_[data-slot=table-container]]:overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background/80 backdrop-blur-md shadow-sm border-b border-border/50">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((header) => (
                  <TableHead key={header.id} style={{ width: header.getSize() }} className="text-[13px] font-semibold text-muted-foreground">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row, idx) => (
                <TableRow key={row.id} className="text-[13px] transition-all duration-200 hover:-translate-y-px hover:shadow-md hover:bg-muted/50 hover:z-10 relative animate-in fade-in slide-in-from-bottom-2" style={{ animationDuration: '400ms', animationDelay: `${idx * 30}ms`, animationFillMode: 'backwards' }}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2">{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-[13px] text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between border-t px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-muted-foreground">Rows per page</span>
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={(v) => table.setPageSize(Number(v))}
          >
            <SelectTrigger size="sm" className="h-7 w-16">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ml-2 text-[13px] text-muted-foreground whitespace-nowrap">
            Total {table.getFilteredRowModel().rows.length} rule{table.getFilteredRowModel().rows.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon-sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button variant="outline" size="icon-sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
