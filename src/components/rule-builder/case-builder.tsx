"use client";

import { ListTree, Plus, Trash2 } from "lucide-react";
import { BusinessRule, CaseWhenClause, Domain, Operator, RuleAction } from "@/lib/types";
import { fieldsForDomain, getField, OPERATORS } from "@/lib/fields";
import { useAppStore } from "@/lib/store";
import { ActionListEditor, OutputFieldPicker } from "@/components/rule-builder/action-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

function newWhen(): CaseWhenClause {
  return { id: `case-when-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, field: "", operator: "=", value: "", outputField: "", outputValue: "" };
}

// The CASE Builder is a distinct rule-type mode: when it has WHEN clauses,
// it IS the complete rule — the normal condition tree, THEN Action Builder,
// and ELSE — Otherwise section are hidden by the caller (rule-builder/page.tsx)
// rather than shown alongside it. `onExitCaseMode` is the only way back to
// that normal view, since this component's toolbar isn't rendered while
// CASE mode is hidden.
export function CaseBuilder({
  whens,
  caseElseActions,
  domain,
  currentRuleId,
  rules,
  onWhensChange,
  onCaseElseActionsChange,
  onExitCaseMode,
}: {
  whens: CaseWhenClause[];
  caseElseActions: RuleAction[];
  domain: Domain;
  currentRuleId?: string;
  rules: BusinessRule[];
  /** Functional updater (like React's setState) rather than a plain array —
   *  guarantees each edit applies against the latest committed caseWhens
   *  even if two edits fire before this component re-renders in between,
   *  instead of racing against a stale `whens` prop snapshot. */
  onWhensChange: (updater: (prev: CaseWhenClause[]) => CaseWhenClause[]) => void;
  onCaseElseActionsChange: (actions: RuleAction[]) => void;
  onExitCaseMode: () => void;
}) {
  const fieldCatalog = useAppStore((s) => s.fieldCatalog);
  const fields = fieldsForDomain(fieldCatalog, domain);

  const addWhen = () => onWhensChange((prev) => [...prev, newWhen()]);
  const updateWhen = (id: string, patch: Partial<CaseWhenClause>) =>
    onWhensChange((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  const removeWhen = (id: string) => onWhensChange((prev) => prev.filter((w) => w.id !== id));

  return (
    <div className="space-y-3 rounded-xl border-2 border-cyan-500/30 bg-cyan-500/[0.03] p-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-sm font-bold tracking-wide text-cyan-700 dark:text-cyan-400">CASE</p>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-sm" onClick={onExitCaseMode}>
          <ListTree className="size-3.5" /> Switch to Condition Builder
        </Button>
      </div>

      {whens.map((when, idx) => {
        const field = getField(fieldCatalog, when.field);
        const availableOperators = OPERATORS.filter((o) => !field || o.types.includes(field.type));
        const isBetween = when.operator === "between";
        return (
          <div key={when.id} className="space-y-2.5 rounded-lg border bg-background p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">WHEN {idx + 1}</span>
              <Button variant="ghost" size="icon-sm" onClick={() => removeWhen(when.id)} title="Delete WHEN" className="text-muted-foreground hover:text-destructive">
                <Trash2 className="size-3.5" />
              </Button>
            </div>

            <div className="rounded-md border bg-muted/20 p-2.5 space-y-1.5">
              <p className="font-mono text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">WHERE</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Field</Label>
                  <Select
                    items={Object.fromEntries(fields.map((f) => [f.key, f.label]))}
                    value={when.field || undefined}
                    onValueChange={(v) => updateWhen(when.id, { field: v as string, value: "", value2: undefined })}
                  >
                    <SelectTrigger size="sm" className="h-8 w-full"><SelectValue placeholder="Search fields..." /></SelectTrigger>
                    <SelectContent>
                      {fields.map((f) => (
                        <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Operator</Label>
                  <Select
                    items={Object.fromEntries(availableOperators.map((o) => [o.value, o.label]))}
                    value={when.operator}
                    onValueChange={(v) => updateWhen(when.id, { operator: v as Operator })}
                  >
                    <SelectTrigger size="sm" className="h-8 w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {availableOperators.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Value</Label>
                  {isBetween ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        type={field?.type === "date" ? "date" : "number"}
                        value={when.value}
                        onChange={(e) => updateWhen(when.id, { value: e.target.value })}
                        placeholder="From"
                        className="h-8 w-full text-sm"
                      />
                      <span className="text-sm text-muted-foreground">–</span>
                      <Input
                        type={field?.type === "date" ? "date" : "number"}
                        value={when.value2 ?? ""}
                        onChange={(e) => updateWhen(when.id, { value2: e.target.value })}
                        placeholder="To"
                        className="h-8 w-full text-sm"
                      />
                    </div>
                  ) : (
                    <Input
                      type={field?.type === "number" || field?.type === "currency" || field?.type === "percentage" ? "number" : "text"}
                      value={when.value}
                      onChange={(e) => updateWhen(when.id, { value: e.target.value })}
                      placeholder="Value"
                      className="h-8 w-full text-sm"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-md border bg-muted/20 p-2.5 space-y-1.5">
              <p className="font-mono text-sm font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">THEN</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Output Field</Label>
                  <OutputFieldPicker
                    value={when.outputField}
                    domain={domain}
                    rules={rules}
                    currentRuleId={currentRuleId}
                    onChange={(key) => updateWhen(when.id, { outputField: key })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Output Value</Label>
                  <Input
                    value={when.outputValue}
                    onChange={(e) => updateWhen(when.id, { outputValue: e.target.value })}
                    placeholder="Output value"
                    className="h-8 w-full text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <Button variant="outline" size="sm" onClick={addWhen} className="h-7 gap-1.5 text-sm">
        <Plus className="size-3" /> Add WHEN
      </Button>

      <div className="border-t pt-3">
        <span className="mb-2 block font-mono text-sm font-bold uppercase tracking-wider text-red-600 dark:text-red-400">ELSE</span>
        <ActionListEditor
          actions={caseElseActions}
          domain={domain}
          rules={rules}
          currentRuleId={currentRuleId}
          onChange={onCaseElseActionsChange}
        />
      </div>
    </div>
  );
}
