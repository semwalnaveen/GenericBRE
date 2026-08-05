"use client";

import { useState } from "react";
import { useAppStore, useHasCapability } from "@/lib/store";
import { MatrixGrid } from "@/components/matrix/matrix-grid";
import { NewMatrixDialog } from "@/components/matrix/new-matrix-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function MatrixPage() {
  const matrices = useAppStore((s) => s.matrices);
  const industries = useAppStore((s) => s.industries);
  const canEdit = useHasCapability("rule.edit");

  // Tabs are keyed per-matrix, not per-domain — a domain can have more than
  // one matrix (e.g. after using New Matrix a second time), and each stays
  // individually reachable instead of only the first being visible.
  const [matrixId, setMatrixId] = useState<string>(() => matrices[0]?.id ?? "");
  // Falls back to the first remaining matrix if the active tab's own was
  // just deleted, without needing an effect to "fix" state after the fact.
  const activeMatrixId = matrices.some((m) => m.id === matrixId) ? matrixId : (matrices[0]?.id ?? "");
  // Value->label map so the closed trigger shows "Domain — Matrix Name"
  // instead of falling back to the raw matrix id (base-ui's Select needs an
  // explicit items map to resolve the trigger's display label).
  const matrixItems = Object.fromEntries(
    matrices.map((m) => {
      const industry = industries.find((i) => i.id === m.domain);
      return [m.id, `${industry?.name ?? m.domain} — ${m.name}`];
    })
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b bg-card/40 px-5 py-3.5 sm:px-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Decision Matrix</h1>
          <p className="text-sm text-muted-foreground">Excel-like truth tables for pricing, haircut & premium slabs</p>
        </div>
        {canEdit && <NewMatrixDialog defaultDomain={industries[0]?.id ?? ""} />}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 p-5 sm:p-6">
        {matrices.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No matrices configured yet. {canEdit && "Create one to get started."}
          </p>
        ) : (
          <>
            <div className="w-full max-w-xl shrink-0 space-y-3.5">
              <label className="text-sm font-semibold text-muted-foreground">Domain</label>
              <Select items={matrixItems} value={activeMatrixId} onValueChange={(v) => setMatrixId(v ?? "")}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {matrices.map((m) => {
                    const industry = industries.find((i) => i.id === m.domain);
                    return (
                      <SelectItem key={m.id} value={m.id}>{industry?.name ?? m.domain} — {m.name}</SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="min-h-0 flex-1">
              {matrices
                .filter((m) => m.id === activeMatrixId)
                .map((m) => (
                  <MatrixGrid key={m.id} matrix={m} />
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
