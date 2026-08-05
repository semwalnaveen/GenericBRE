"use client";

import { useMemo, useState } from "react";
import { PlayCircle, CheckCircle2, XCircle, FlaskConical } from "lucide-react";
import { ConditionGroup, RuleAction } from "@/lib/types";
import { collectFieldKeys } from "@/lib/condition-tree";
import { evaluateGroup, resolveActionValue, resolveBracketValue, ConditionEvalDetail } from "@/lib/engine";
import { extractVariableKeys } from "@/lib/expression";
import { getField } from "@/lib/fields";
import { useAppStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Single-rule inline testing — a standalone rule is tested in isolation
// here. A real multi-rule chained run (mapped rules, in configured
// Product-Rule Mapping order) belongs to Rule Simulator, which already does
// this correctly against live execution semantics.
export function InlineTestPanel({
  rootGroup,
  actions,
  elseActions,
}: {
  rootGroup: ConditionGroup;
  actions: RuleAction[];
  elseActions?: RuleAction[];
}) {
  const fieldCatalog = useAppStore((s) => s.fieldCatalog);
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{
    passed: boolean;
    details: ConditionEvalDetail[];
    outputs: Record<string, { value: string | number; error?: string }>;
  } | null>(null);

  const fieldKeys = useMemo(() => {
    const keys = new Set(collectFieldKeys(rootGroup));
    const allActions = [...actions, ...(elseActions ?? [])];
    const generated = new Set<string>();
    
    for (const action of allActions) {
      if ((action.type === "Calculate" || action.type === "Assign Value") && action.outputValue) {
        const extracted = extractVariableKeys(action.outputValue);
        extracted.forEach((k) => {
          if (!generated.has(k)) keys.add(k);
        });
      } else if (action.type === "Bracket Lookup" && action.bracketField) {
        if (!generated.has(action.bracketField)) keys.add(action.bracketField);
      }
      
      const outKey = action.outputTarget === "RUNTIME_VARIABLE" ? action.outputVariable : action.outputField;
      if (outKey) {
        generated.add(outKey);
      }
    }
    
    return Array.from(keys);
  }, [rootGroup, actions, elseActions]);

  const buildInput = () => {
    const input: Record<string, string | number | boolean> = {};
    for (const key of fieldKeys) {
      const field = getField(fieldCatalog, key);
      const raw = values[key] ?? "";
      let v: string | number | boolean = raw;
      if (field?.type === "number" || field?.type === "currency" || field?.type === "percentage") v = parseFloat(String(v)) || 0;
      if (field?.type === "boolean") v = v === "true";
      input[key] = v;
    }
    return input;
  };

  const hasCalculate = actions.some((a) => a.type === "Calculate");

  const runTest = () => {
    const input = buildInput();
    const details: ConditionEvalDetail[] = [];
    const passed = evaluateGroup(rootGroup, input, details, fieldCatalog);

    // Resolve Calculate/Assign Value outputs for whichever branch actually
    // fires, chaining each action's result into the context for the next
    // (so a later Calculate can reference an earlier one's output by name).
    const firingActions = (passed || hasCalculate) ? actions : elseActions ?? [];
    const outputs: Record<string, { value: string | number; error?: string }> = {};
    const context: Record<string, string | number | boolean> = { ...input };
    for (const action of firingActions) {
      const outKey = action.outputTarget === "RUNTIME_VARIABLE" ? action.outputVariable : action.outputField;
      if ((action.type === "Calculate" || action.type === "Assign Value") && outKey) {
        const resolved = resolveActionValue(action, context);
        outputs[outKey] = resolved;
        context[outKey] = resolved.value;
      } else if (action.type === "Bracket Lookup" && outKey) {
        const resolved = resolveBracketValue(action, context);
        outputs[outKey] = resolved;
        if (!resolved.error) context[outKey] = resolved.value;
      }
    }

    setResult({ passed, details, outputs });
  };

  const activeActions = result?.passed ? actions : elseActions;
  const activeBranch = result?.passed ? "THEN" : elseActions?.length ? "ELSE" : null;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
        <FlaskConical className="size-3.5 text-primary" /> Inline Rule Testing
      </div>

      {fieldKeys.length === 0 ? (
        <p className="text-sm text-muted-foreground">Add conditions above to enable inline testing.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            {fieldKeys.map((key) => {
              const field = getField(fieldCatalog, key);
              return (
                <div key={key} className="space-y-1">
                  <label className="text-sm text-muted-foreground">{field?.label ?? key}</label>
                  {field?.type === "boolean" ? (
                    <Select items={{ true: "Yes", false: "No" }} value={values[key]} onValueChange={(v) => setValues((s) => ({ ...s, [key]: v as string }))}>
                      <SelectTrigger size="sm" className="h-8 w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : field?.type === "enum" && field.options ? (
                    <Select value={values[key]} onValueChange={(v) => setValues((s) => ({ ...s, [key]: v ?? "" }))}>
                      <SelectTrigger size="sm" className="h-8 w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        {field.options.map((o) => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={field?.type === "number" || field?.type === "currency" || field?.type === "percentage" ? "number" : field?.type === "date" ? "date" : "text"}
                      value={values[key] ?? ""}
                      onChange={(e) => setValues((s) => ({ ...s, [key]: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  )}
                </div>
              );
            })}
          </div>

          <Button size="sm" className="mt-3 w-full gap-1.5" onClick={runTest}>
            <PlayCircle className="size-3.5" /> Run Test
          </Button>

          {result && (
            <div className="mt-3 space-y-2 border-t pt-3">
              {!hasCalculate && (
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-semibold",
                    result.passed ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400"
                  )}
                >
                  {result.passed ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
                  {result.passed ? "IF MATCHED" : "IF DID NOT MATCH"}
                  {activeBranch && activeActions && activeActions.length > 0 && (
                    <span className="ml-auto font-normal text-foreground/70">
                      {activeBranch}: {activeActions.map((a) => a.type).join(", ")}
                    </span>
                  )}
                  {!result.passed && !elseActions?.length && (
                    <span className="ml-auto font-normal text-foreground/70">no ELSE branch — nothing fires</span>
                  )}
                </div>
              )}
              <div className="space-y-1">
                {result.details.map((d, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1 text-sm">
                    <span>
                      {d.field} {d.operator} {d.expected}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-muted-foreground">actual: {d.actual}</span>
                      {d.passed ? <CheckCircle2 className="size-3 text-emerald-500" /> : <XCircle className="size-3 text-red-500" />}
                    </span>
                  </div>
                ))}
              </div>
              {Object.keys(result.outputs).length > 0 && (
                <div className="space-y-1">
                  {Object.entries(result.outputs).map(([field, out]) => (
                    <div key={field} className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1 text-sm">
                      <span className="font-mono">{field}</span>
                      {out.error ? (
                        <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                          <XCircle className="size-3" /> {out.error}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-3" /> = {out.value}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
