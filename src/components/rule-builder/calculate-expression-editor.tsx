"use client";

import { useState, useMemo, useEffect, Fragment } from "react";
import { Variable, AlertCircle, CheckCircle2, Calculator, Plus, Minus, X, Divide, Percent, Delete, ArrowLeft } from "lucide-react";
import { BusinessField, BusinessRule, ConditionGroup, Domain, RuleAction } from "@/lib/types";
import {
  AvailableVariable,
  availableVariableKeys,
  buildDefaultPreviewContext,
  getAvailableVariables,
} from "@/lib/available-variables";
import { extractVariableKeys, findUnknownVariableKeys, previewExpression, parseExpressionToTokens, compileTokensToExpression, FormulaToken } from "@/lib/expression";
import { getField } from "@/lib/fields";
import { useAppStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DEFAULT_FIELD_CATALOG } from "@/lib/fields";

const SOURCE_HEADINGS: Record<AvailableVariable["source"], string> = {
  condition: "Condition Fields",
  field: "Input Fields",
  generated: "Generated Variables",
  "same-rule": "This Rule (earlier actions)",
};

function formatResult(value: string | number): string {
  if (typeof value === "number") {
    if (Number.isInteger(value)) return value.toLocaleString();
    return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  return String(value);
}

function FormulaTokenChip({ token, variables, fieldCatalog, onRemove }: { token: FormulaToken, variables: AvailableVariable[], fieldCatalog: BusinessField[], onRemove?: () => void }) {
  let content;
  let chipClass = "";

  if (token.type === "operator") {
    const opMap: Record<string, any> = { "+": Plus, "-": Minus, "*": X, "/": Divide, "%": Percent };
    const Icon = token.value ? opMap[token.value] : null;
    chipClass = "bg-muted/50 border-transparent text-muted-foreground";
    content = Icon ? <Icon className="size-3.5" /> : <span className="font-mono text-sm font-semibold">{token.value}</span>;
  } else if (token.type === "number") {
    chipClass = "border-primary/20 bg-primary/5 text-primary";
    content = <span className="font-mono text-sm font-medium">{token.value}</span>;
  } else {
    // Variable
    const label = variables.find((v) => v.key === token.key)?.label ?? getField(fieldCatalog, token.key!)?.label ?? token.key;
    const isUnknown = !variables.some(v => v.key === token.key);
    chipClass = isUnknown ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-border bg-background hover:border-primary/30 text-foreground";
    content = (
      <>
        <Variable className={cn("size-3.5", isUnknown ? "text-destructive" : "text-primary")} />
        {label}
      </>
    );
  }

  return (
    <div className={cn("group relative flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm shadow-sm transition-colors", chipClass)}>
      {content}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full border bg-background text-muted-foreground opacity-0 shadow-sm transition-opacity hover:bg-destructive hover:text-destructive-foreground hover:border-destructive group-hover:opacity-100"
        >
          <X className="size-2.5" />
        </button>
      )}
    </div>
  );
}

export function CalculateExpressionEditor({
  value,
  onChange,
  domain,
  rules,
  currentRuleId,
  rootGroup,
  priorActions,
  outputField,
}: {
  value: string;
  onChange: (next: string) => void;
  domain: Domain;
  rules: BusinessRule[];
  currentRuleId?: string;
  rootGroup?: ConditionGroup;
  priorActions?: RuleAction[];
  outputField?: string;
}) {
  const fieldCatalog = useAppStore((s) => s.fieldCatalog);
  const [isOpen, setIsOpen] = useState(false);
  const [localTokens, setLocalTokens] = useState<FormulaToken[]>([]);

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

  const tokens = useMemo(() => parseExpressionToTokens(value), [value]);

  useEffect(() => {
    if (isOpen) {
      setLocalTokens(parseExpressionToTokens(value));
    }
  }, [isOpen, value]);

  const saveTokens = (newTokens: FormulaToken[]) => {
    setLocalTokens(newTokens);
    onChange(compileTokensToExpression(newTokens));
  };

  const [cursorIndex, setCursorIndex] = useState<number | null>(null);

  const handleAddToken = (token: FormulaToken) => {
    const newTokens = [...localTokens];
    if (cursorIndex !== null) {
      newTokens.splice(cursorIndex, 0, token);
      saveTokens(newTokens);
      setCursorIndex(cursorIndex + 1);
    } else {
      saveTokens([...localTokens, token]);
      setCursorIndex(localTokens.length + 1);
    }
  };

  const handleRemoveLast = () => {
    if (localTokens.length === 0) return;
    const newTokens = [...localTokens];
    if (cursorIndex !== null) {
      if (cursorIndex > 0) {
        newTokens.splice(cursorIndex - 1, 1);
        saveTokens(newTokens);
        setCursorIndex(cursorIndex - 1);
      }
    } else {
      newTokens.pop();
      saveTokens(newTokens);
    }
  };

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault(); // Necessary to allow dropping
    if (dragOverIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === dropIndex) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }
    const newTokens = [...localTokens];
    const [movedItem] = newTokens.splice(draggedIdx, 1);
    newTokens.splice(dropIndex, 0, movedItem);
    saveTokens(newTokens);
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleClear = () => {
    saveTokens([]);
    setCursorIndex(null);
  };

  const groupedVars = useMemo(() => {
    const groups = new Map<AvailableVariable["source"], AvailableVariable[]>();
    for (const v of variables) {
      const list = groups.get(v.source) ?? [];
      list.push(v);
      groups.set(v.source, list);
    }
    const order: AvailableVariable["source"][] = ["condition", "field", "same-rule", "generated"];
    return order.filter((s) => groups.has(s)).map((s) => ({ source: s, items: groups.get(s)! }));
  }, [variables]);

  // Preview logic for drawer
  const [sampleOverrides, setSampleOverrides] = useState<Record<string, string>>({});
  const availableKeys = useMemo(() => availableVariableKeys(variables), [variables]);
  const localExpr = useMemo(() => compileTokensToExpression(localTokens), [localTokens]);
  const unknownKeys = useMemo(() => findUnknownVariableKeys(localExpr, availableKeys), [localExpr, availableKeys]);
  const referencedKeys = useMemo(() => extractVariableKeys(localExpr), [localExpr]);
  const defaultContext = useMemo(() => buildDefaultPreviewContext(fieldCatalog, variables, rootGroup), [fieldCatalog, variables, rootGroup]);

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

  const preview = useMemo(() => previewExpression(localExpr, previewContext), [localExpr, previewContext]);
  const hasExpression = localExpr.trim().length > 0;
  const isValid = hasExpression && unknownKeys.length === 0 && !preview.result.error;

  const labelExpression = useMemo(() => {
    return localTokens.map(t => {
      if (t.type === "variable") {
        return variables.find(v => v.key === t.key)?.label ?? getField(fieldCatalog, t.key!)?.label ?? t.key;
      }
      if (t.type === "operator") {
        const v = t.value === "*" ? "×" : t.value === "/" ? "÷" : t.value;
        return v === "(" || v === ")" ? v : ` ${v} `;
      }
      return t.value ?? "";
    }).join("").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")");
  }, [localTokens, variables, fieldCatalog]);

  return (
    <div className="space-y-2 sm:col-span-2">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-2">
          <div className="flex min-h-10 flex-1 flex-wrap items-center gap-1.5 rounded-lg border bg-muted/20 p-1.5 px-2">
            {tokens.length === 0 ? (
              <span className="text-sm text-muted-foreground">No calculation formula defined.</span>
            ) : (
              tokens.map((t, i) => <FormulaTokenChip key={i} token={t} variables={variables} fieldCatalog={fieldCatalog} />)
            )}
          </div>
          <Button variant="outline" size="sm" className="h-10 shrink-0 gap-1.5" onClick={() => setIsOpen(true)}>
            <Calculator className="size-4" />
            Edit Formula
          </Button>
        </div>

        {tokens.length > 0 && (() => {
          const savedPreview = previewExpression(value, defaultContext);
          if (savedPreview.result.error) return null;
          const outField = outputField ? getField(fieldCatalog, outputField) : undefined;
          const outLabel = outField?.label || outputField || "Output";
          const defaultField = DEFAULT_FIELD_CATALOG.find(f => f.key === outputField);
          const outUnit = outField?.unit || defaultField?.unit || "";
          return (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{outLabel}:</span> {formatResult(savedPreview.result.value)}{outUnit}
            </div>
          );
        })()}

        <SheetContent className="flex w-[95vw] flex-col p-0 sm:max-w-5xl data-[side=right]:sm:max-w-5xl" side="right">
          <div className="flex h-14 shrink-0 items-center justify-between border-b px-4 sm:px-6">
            <SheetTitle className="flex items-center gap-2">
              <Calculator className="size-5 text-primary" />
              Formula Builder
            </SheetTitle>
          </div>

          <div className="flex min-h-0 flex-1 flex-col md:flex-row overflow-hidden">
            {/* Main Editor Area */}
            <div className="flex flex-1 flex-col overflow-y-auto p-4 sm:p-6">
              <div className="mb-4 text-sm font-medium">Expression</div>

              {/* Token Display */}
              <div
                className="mb-4 min-h-24 rounded-xl border bg-muted/20 p-3 shadow-inner cursor-text"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setCursorIndex(localTokens.length);
                }}
              >
                <div className="flex flex-wrap items-center gap-0">
                  {localTokens.length === 0 ? (
                    <div className="flex items-center gap-2">
                      <div className={cn("h-5 w-[2px] rounded-full", cursorIndex === 0 ? "bg-primary animate-pulse" : "bg-transparent")} />
                      <span className="text-sm text-muted-foreground pointer-events-none">Click variables and operators to build your formula...</span>
                    </div>
                  ) : (
                    <>
                      {localTokens.map((t, i) => (
                        <Fragment key={i}>
                          <div
                            onClick={(e) => { e.stopPropagation(); setCursorIndex(i); }}
                            className="group flex h-8 w-3 cursor-text items-center justify-center shrink-0"
                          >
                            <div className={cn("h-5 w-[2px] rounded-full", cursorIndex === i ? "bg-primary animate-pulse" : "bg-transparent group-hover:bg-primary/30")} />
                          </div>
                          <div
                            draggable
                            onDragStart={(e) => handleDragStart(e, i)}
                            onDragOver={(e) => handleDragOver(e, i)}
                            onDrop={(e) => handleDrop(e, i)}
                            onDragEnd={handleDragEnd}
                            className={cn(
                              "cursor-grab active:cursor-grabbing transition-transform rounded-full",
                              dragOverIdx === i && (draggedIdx !== null && draggedIdx < i ? "border-r-2 border-r-primary pl-1 pr-3" : "border-l-2 border-l-primary pr-1 pl-3"),
                              draggedIdx === i && "opacity-50"
                            )}
                          >
                            <FormulaTokenChip
                              token={t}
                              variables={variables}
                              fieldCatalog={fieldCatalog}
                              onRemove={() => {
                                saveTokens(localTokens.filter((_, idx) => idx !== i));
                                if (cursorIndex !== null) {
                                  if (i < cursorIndex) setCursorIndex(cursorIndex - 1);
                                  else if (i === cursorIndex) setCursorIndex(cursorIndex);
                                }
                              }}
                            />
                          </div>
                        </Fragment>
                      ))}
                      <div
                        onClick={(e) => { e.stopPropagation(); setCursorIndex(localTokens.length); }}
                        className="group flex h-8 w-3 cursor-text items-center justify-center shrink-0"
                      >
                        <div className={cn("h-5 w-[2px] rounded-full", cursorIndex === localTokens.length ? "bg-primary animate-pulse" : "bg-transparent group-hover:bg-primary/30")} />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Toolbar */}
              <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button variant="outline" size="icon-sm" onClick={() => handleAddToken({ type: "operator", value: "+" })}><Plus className="size-4" /></Button>
                  <Button variant="outline" size="icon-sm" onClick={() => handleAddToken({ type: "operator", value: "-" })}><Minus className="size-4" /></Button>
                  <Button variant="outline" size="icon-sm" onClick={() => handleAddToken({ type: "operator", value: "*" })}><X className="size-4" /></Button>
                  <Button variant="outline" size="icon-sm" onClick={() => handleAddToken({ type: "operator", value: "/" })}><Divide className="size-4" /></Button>
                  <Button variant="outline" size="icon-sm" onClick={() => handleAddToken({ type: "operator", value: "%" })}><Percent className="size-4" /></Button>
                  <div className="mx-1 h-6 hidden sm:block w-px bg-border"></div>
                  <Button variant="outline" size="sm" className="font-mono font-bold" onClick={() => handleAddToken({ type: "operator", value: "(" })}>(</Button>
                  <Button variant="outline" size="sm" className="font-mono font-bold" onClick={() => handleAddToken({ type: "operator", value: ")" })}>)</Button>
                  <div className="mx-1 h-6 hidden sm:block w-px bg-border"></div>
                  <Input
                    type="number"
                    placeholder="Num..."
                    className="h-8 w-20 font-mono text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const v = e.currentTarget.value;
                        if (v) {
                          handleAddToken({ type: "number", value: v });
                          e.currentTarget.value = "";
                        }
                      }
                    }}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleClear} className="text-muted-foreground hover:text-destructive">Clear</Button>
                  <Button variant="secondary" size="sm" onClick={handleRemoveLast} className="gap-1.5"><ArrowLeft className="size-3.5" /> Backspace</Button>
                </div>
              </div>

              {/* Live Preview */}
              <div className="mb-4 text-sm font-medium">Live Preview</div>
              {hasExpression && isValid ? (
                <div className="rounded-lg border bg-emerald-500/10 px-4 py-4 shadow-sm space-y-6">
                  {referencedKeys.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-wider text-emerald-800/70 dark:text-emerald-200/70">Fields</div>
                      <div className="space-y-1.5">
                        {referencedKeys.map(key => {
                          const field = getField(fieldCatalog, key);
                          const currentVal = sampleOverrides[key] ?? String(previewContext[key] ?? "");
                          const label = variables.find(v => v.key === key)?.label ?? field?.label ?? key;
                          return (
                            <div key={key} className="flex items-center gap-2 font-mono text-sm text-emerald-900 dark:text-emerald-100">
                              <span className="min-w-40 opacity-80">{label} =</span>
                              <Input
                                type={field?.type === "number" || field?.type === "currency" ? "number" : "text"}
                                value={currentVal}
                                onChange={(e) => setSampleOverrides((s) => ({ ...s, [key]: e.target.value }))}
                                className="h-6 w-32 border-b border-emerald-900/30 border-t-0 border-r-0 border-l-0 bg-transparent px-1 py-0 font-mono text-sm shadow-none focus-visible:ring-0 focus-visible:border-emerald-900/60 rounded-none text-emerald-900 dark:text-emerald-100 placeholder:text-emerald-900/30"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-emerald-800/70 dark:text-emerald-200/70">Expression</div>
                    <div className="font-mono text-sm leading-relaxed text-emerald-900/90 dark:text-emerald-100/90">
                      {labelExpression}
                    </div>
                    <div className="font-mono text-sm leading-relaxed text-emerald-950 dark:text-emerald-50">
                      {preview.substituted}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-emerald-800/70 dark:text-emerald-200/70">Output</div>
                    <div className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400">
                      {(() => {
                        const outField = outputField ? getField(fieldCatalog, outputField) : undefined;
                        const outLabel = outField?.label || outputField || "Output";
                        const defaultField = DEFAULT_FIELD_CATALOG.find(f => f.key === outputField);
                        const outUnit = outField?.unit || defaultField?.unit || "";
                        return `Calculated ${outLabel} = ${formatResult(preview.result.value)}${outUnit}`;
                      })()}
                    </div>
                  </div>
                </div>
              ) : hasExpression && unknownKeys.length > 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-sm">
                  <AlertCircle className="size-4 shrink-0" />
                  Unknown variables detected.
                </div>
              ) : hasExpression && preview.result.error ? (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-sm">
                  <AlertCircle className="size-4 shrink-0" />
                  {preview.result.error}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                  Valid expression required for preview.
                </div>
              )}

            </div>

            {/* Sidebar Fields Picker */}
            <div className="w-full h-[40vh] md:h-full md:w-72 shrink-0 border-t md:border-t-0 md:border-l bg-muted/10">
              <ScrollArea className="h-full">
                <div className="p-4 pb-12">
                  <div className="mb-4 font-medium">Insert Field</div>
                  <div className="space-y-6">
                    {groupedVars.map(({ source, items }) => (
                      <div key={source} className={cn("space-y-2 rounded-lg p-2", source === "condition" && "bg-primary/5 border border-primary/20 shadow-sm")}>
                        <h4 className={cn("text-xs font-bold uppercase tracking-wider px-1", source === "condition" ? "text-primary" : "text-muted-foreground")}>
                          {SOURCE_HEADINGS[source]}
                        </h4>
                        <div className="flex flex-col gap-1">
                          {items.map((v) => (
                            <button
                              key={v.key}
                              type="button"
                              onClick={() => handleAddToken({ type: "variable", key: v.key })}
                              className={cn(
                                "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                                source === "condition" ? "bg-background hover:bg-primary/10 text-foreground" : "hover:bg-muted hover:text-foreground"
                              )}
                            >
                              {(source === "generated" || source === "same-rule") && (
                                <Variable className="size-3.5 shrink-0 text-primary" />
                              )}
                              <span className="min-w-0 truncate">{v.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
