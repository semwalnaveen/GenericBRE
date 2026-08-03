"use client";

import { useMemo, useRef, useState } from "react";
import { Braces, Variable, AlertCircle, CheckCircle2 } from "lucide-react";
import { BusinessField, BusinessRule, ConditionGroup, Domain, RuleAction } from "@/lib/types";
import {
  AvailableVariable,
  availableVariableKeys,
  buildDefaultPreviewContext,
  getAvailableVariables,
} from "@/lib/available-variables";
import { extractVariableKeys, findUnknownVariableKeys, previewExpression } from "@/lib/expression";
import { getField } from "@/lib/fields";
import { useAppStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const SOURCE_HEADINGS: Record<AvailableVariable["source"], string> = {
  condition: "Condition Fields",
  field: "Input Fields",
  generated: "Generated Variables",
  "same-rule": "This Rule (earlier actions)",
};

function groupVariables(variables: AvailableVariable[]) {
  const groups = new Map<AvailableVariable["source"], AvailableVariable[]>();
  for (const v of variables) {
    const list = groups.get(v.source) ?? [];
    list.push(v);
    groups.set(v.source, list);
  }
  const order: AvailableVariable["source"][] = ["condition", "field", "same-rule", "generated"];
  return order.filter((s) => groups.has(s)).map((s) => ({ source: s, items: groups.get(s)! }));
}

function VariablePicker({
  variables,
  onInsert,
}: {
  variables: AvailableVariable[];
  onInsert: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const grouped = useMemo(() => groupVariables(variables), [variables]);

  const select = (key: string) => {
    onInsert(key);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button type="button" variant="ghost" size="icon-sm" className="shrink-0" title="Insert variable reference" />
        }
      >
        <Braces className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <Command>
          <CommandInput placeholder="Search variables..." />
          <CommandList>
            <CommandEmpty>No matching variables.</CommandEmpty>
            {grouped.map(({ source, items }) => (
              <CommandGroup key={source} heading={SOURCE_HEADINGS[source]}>
                {items.map((v) => (
                  <CommandItem
                    key={v.key}
                    value={`${v.label} ${v.key}`}
                    onSelect={() => select(v.key)}
                    className="gap-2"
                  >
                    {(source === "generated" || source === "same-rule") && (
                      <Variable className="size-3.5 shrink-0 text-primary" />
                    )}
                    <span className="min-w-0 truncate">{v.label}</span>
                    <span className="ml-auto shrink-0 font-mono text-sm text-muted-foreground">{v.key}</span>
                    {v.sourceDetail && source !== "field" && source !== "condition" && (
                      <span className="sr-only">{v.sourceDetail}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function formatResult(value: string | number): string {
  if (typeof value === "number") {
    if (Number.isInteger(value)) return value.toLocaleString();
    return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  return String(value);
}

export function CalculateExpressionEditor({
  value,
  onChange,
  domain,
  rules,
  currentRuleId,
  rootGroup,
  priorActions,
}: {
  value: string;
  onChange: (next: string) => void;
  domain: Domain;
  rules: BusinessRule[];
  currentRuleId?: string;
  rootGroup?: ConditionGroup;
  priorActions?: RuleAction[];
}) {
  const fieldCatalog = useAppStore((s) => s.fieldCatalog);
  const inputRef = useRef<HTMLInputElement>(null);
  const [sampleOverrides, setSampleOverrides] = useState<Record<string, string>>({});

  const variables = useMemo(
    () =>
      getAvailableVariables({
        fieldCatalog,
        domain,
        rules,
        currentRuleId,
        rootGroup,
        priorActions,
      }),
    [fieldCatalog, domain, rules, currentRuleId, rootGroup, priorActions]
  );

  const availableKeys = useMemo(() => availableVariableKeys(variables), [variables]);
  const unknownKeys = useMemo(() => findUnknownVariableKeys(value, availableKeys), [value, availableKeys]);
  const referencedKeys = useMemo(() => extractVariableKeys(value), [value]);

  const defaultContext = useMemo(
    () => buildDefaultPreviewContext(fieldCatalog, variables, rootGroup),
    [fieldCatalog, variables, rootGroup]
  );

  const previewContext = useMemo(() => {
    const ctx: Record<string, string | number | boolean> = { ...defaultContext };
    for (const key of referencedKeys) {
      const override = sampleOverrides[key];
      if (override === undefined || override === "") continue;
      const field = getField(fieldCatalog, key);
      if (field?.type === "number" || field?.type === "currency" || field?.type === "percentage") {
        const n = parseFloat(override);
        if (!Number.isNaN(n)) ctx[key] = n;
      } else if (field?.type === "boolean") {
        ctx[key] = override === "true";
      } else {
        ctx[key] = override;
      }
    }
    return ctx;
  }, [defaultContext, referencedKeys, sampleOverrides, fieldCatalog]);

  const preview = useMemo(() => previewExpression(value, previewContext), [value, previewContext]);
  const hasExpression = value.trim().length > 0;
  const isValid = hasExpression && unknownKeys.length === 0 && !preview.result.error;

  const insertFieldReference = (key: string) => {
    const token = `{{${key}}}`;
    const input = inputRef.current;
    const start = input?.selectionStart ?? value.length;
    const end = input?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      const pos = start + token.length;
      input?.focus();
      input?.setSelectionRange(pos, pos);
    });
  };

  const labelForKey = (key: string) => variables.find((v) => v.key === key)?.label ?? getField(fieldCatalog, key)?.label ?? key;

  return (
    <div className="space-y-2 sm:col-span-2">
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          placeholder="e.g. {{loan_amount}} × 0.05"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn("h-8 flex-1 font-mono text-sm", unknownKeys.length > 0 && "border-destructive focus-visible:ring-destructive/30")}
          aria-invalid={unknownKeys.length > 0}
        />
        <VariablePicker variables={variables} onInsert={insertFieldReference} />
      </div>

      {unknownKeys.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="size-3 shrink-0" />
          Unknown variable{unknownKeys.length > 1 ? "s" : ""}:{" "}
          {unknownKeys.map((key) => (
            <code key={key} className="rounded bg-destructive/10 px-1 font-mono">
              {`{{${key}}}`}
            </code>
          ))}
          <span className="text-muted-foreground">— use {"{}"} to pick from available variables.</span>
        </div>
      )}

      {hasExpression && unknownKeys.length === 0 && preview.result.error && (
        <div className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="size-3 shrink-0" />
          {preview.result.error}
        </div>
      )}

      {hasExpression && isValid && (
        <div className="rounded-lg border bg-muted/30 px-2.5 py-2">
          <div className="mb-1 flex items-center gap-1 text-sm font-medium text-muted-foreground">
            <CheckCircle2 className="size-3 text-emerald-500" />
            Live preview
          </div>
          <p className="font-mono text-sm leading-relaxed">
            {preview.substituted}
            {" = "}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatResult(preview.result.value)}</span>
          </p>
        </div>
      )}

      {referencedKeys.length > 0 && (
        <div className="rounded-lg border border-dashed px-2.5 py-2">
          <p className="mb-1.5 text-sm font-medium text-muted-foreground">Sample values for preview</p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {referencedKeys.map((key) => {
              const field = getField(fieldCatalog, key);
              const currentVal = sampleOverrides[key] ?? String(previewContext[key] ?? "");
              return (
                <div key={key} className="flex items-center gap-1.5">
                  <label className="min-w-0 flex-1 truncate text-sm" title={labelForKey(key)}>
                    {labelForKey(key)}
                  </label>
                  <Input
                    type={field?.type === "number" || field?.type === "currency" || field?.type === "percentage" ? "number" : "text"}
                    value={currentVal}
                    onChange={(e) => setSampleOverrides((s) => ({ ...s, [key]: e.target.value }))}
                    className="h-7 w-28 shrink-0 font-mono text-sm"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Click <code className="rounded bg-muted px-1">{"{}"}</code> to insert a variable — labels are shown in the picker,
        but expressions use internal keys like <code className="rounded bg-muted px-1">{"{{loan_amount}}"}</code>. Supports +, −, ×, ÷, %, and parentheses.
      </p>
    </div>
  );
}
