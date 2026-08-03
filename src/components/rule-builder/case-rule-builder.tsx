"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { BusinessRule, Condition, ConditionGroup, Domain, Operator, RuleAction, RuleBracket } from "@/lib/types";
import { emptyCondition, emptyGroup } from "@/lib/condition-tree";
import { fieldsForDomain, getField, OPERATORS } from "@/lib/fields";
import { useAppStore } from "@/lib/store";
import { CalculateExpressionEditor } from "@/components/rule-builder/calculate-expression-editor";
import { ActionListEditor, OutputFieldPicker } from "@/components/rule-builder/action-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ThenValueType = "Bracket Lookup" | "Static Value" | "Formula / Expression" | "Decision Matrix Lookup";

function inferValueType(action: RuleAction | null): ThenValueType {
  if (action?.type === "Bracket Lookup") return "Bracket Lookup";
  if (action?.type === "Calculate") return "Formula / Expression";
  return "Static Value";
}

// Bracket range rows for the THEN section's "Bracket Lookup" value type —
// e.g. credit score 750-799 -> 8.75. Scoped to the CASE builder only (the
// general IF/WHERE/GROUP action list intentionally doesn't offer this).
function BracketRowsEditor({ brackets, onChange }: { brackets: RuleBracket[]; onChange: (brackets: RuleBracket[]) => void }) {
  const addRow = () => {
    const highestMax = brackets.length > 0 ? Math.max(...brackets.map((b) => b.max)) : 0;
    onChange([...brackets, { id: `bkt-${Date.now()}`, min: highestMax + 1, max: highestMax + 1, outputValue: "" }]);
  };
  const updateRow = (id: string, patch: Partial<RuleBracket>) =>
    onChange(brackets.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const removeRow = (id: string) => onChange(brackets.filter((b) => b.id !== id));
  const sorted = [...brackets].sort((a, b) => b.min - a.min);

  return (
    <div className="space-y-1.5 sm:col-span-2">
      {sorted.map((b, i) => (
        <div key={b.id} className="flex flex-wrap items-center gap-1.5">
          <Input type="number" value={b.min} onChange={(e) => updateRow(b.id, { min: Number(e.target.value) })} className="h-8 w-24 text-sm" />
          {i < sorted.length - 1 || sorted.length === 1 ? (
            <>
              <span className="text-sm text-muted-foreground">to</span>
              <Input type="number" value={b.max} onChange={(e) => updateRow(b.id, { max: Number(e.target.value) })} className="h-8 w-24 text-sm" />
            </>
          ) : (
            <span className="text-sm text-muted-foreground">and above</span>
          )}
          <span className="text-sm text-muted-foreground">→</span>
          <Input placeholder="Output value" value={b.outputValue} onChange={(e) => updateRow(b.id, { outputValue: e.target.value })} className="h-8 flex-1 text-sm" />
          <Button variant="ghost" size="icon-sm" onClick={() => removeRow(b.id)} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addRow} className="h-7 gap-1.5 text-sm">
        <Plus className="size-3" /> Add Bracket
      </Button>
    </div>
  );
}

// Dedicated CASE rule layout — WHERE (one or more plain conditions, no
// AND/OR, no nesting) -> THEN (one output, several possible value types) ->
// ELSE. Entirely separate from the IF/WHERE/GROUP condition-tree builder.
export function CaseRuleBuilder({
  rootGroup,
  actions,
  elseActions,
  domain,
  currentRuleId,
  rules,
  onRootGroupChange,
  onActionsChange,
  onElseActionsChange,
}: {
  rootGroup: ConditionGroup;
  actions: RuleAction[];
  elseActions?: RuleAction[];
  domain: Domain;
  currentRuleId?: string;
  rules: BusinessRule[];
  onRootGroupChange: (group: ConditionGroup) => void;
  onActionsChange: (actions: RuleAction[]) => void;
  onElseActionsChange: (actions: RuleAction[]) => void;
}) {
  const fieldCatalog = useAppStore((s) => s.fieldCatalog);
  const fields = fieldsForDomain(fieldCatalog, domain);

  const whereConditions = rootGroup.children.filter((c): c is Condition => c.type === "condition");
  const thenAction = actions[0] ?? null;
  const hasElse = (elseActions?.length ?? 0) > 0;
  const [valueType, setValueType] = useState<ThenValueType>(() => inferValueType(thenAction));

  // First-time init: one WHERE row, one THEN action, default Reject ELSE.
  useEffect(() => {
    if (whereConditions.length === 0) {
      onRootGroupChange({ ...emptyGroup("AND"), children: [emptyCondition()] });
    }
    if (!thenAction) {
      onActionsChange([{ id: `act-${Date.now()}`, type: "Assign Value" }]);
    }
    if (!hasElse) {
      onElseActionsChange([{ id: `act-${Date.now()}-else`, type: "Reject", reasonCode: "NO_MATCH", message: "No condition matched — application rejected." }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateWhere = (id: string, patch: Partial<Condition>) =>
    onRootGroupChange({
      ...rootGroup,
      children: rootGroup.children.map((c) => (c.id === id && c.type === "condition" ? { ...c, ...patch } : c)),
    });
  const addWhere = () => onRootGroupChange({ ...rootGroup, children: [...rootGroup.children, emptyCondition()] });
  const removeWhere = (id: string) => {
    if (whereConditions.length <= 1) return;
    onRootGroupChange({ ...rootGroup, children: rootGroup.children.filter((c) => c.id !== id) });
  };

  const updateThenAction = (patch: Partial<RuleAction>) => {
    if (!thenAction) return;
    onActionsChange(actions.map((a) => (a.id === thenAction.id ? { ...a, ...patch } : a)));
  };
  const changeValueType = (next: ThenValueType) => {
    setValueType(next);
    if (!thenAction) return;
    if (next === "Bracket Lookup") updateThenAction({ type: "Bracket Lookup", brackets: thenAction.brackets ?? [] });
    else if (next === "Formula / Expression") updateThenAction({ type: "Calculate" });
    else updateThenAction({ type: "Assign Value" });
  };

  const outputField = getField(fieldCatalog, thenAction?.outputField ?? "");

  return (
    <div className="space-y-4">
      <p className="px-1 font-mono text-sm font-bold text-primary">CASE</p>

      {/* WHERE */}
      <div>
        <h2 className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="rounded-md border border-cyan-500 bg-cyan-500/10 px-2 py-0.5 font-mono text-sm font-bold text-cyan-700 dark:text-cyan-400">WHERE</span>
        </h2>
        <div className="overflow-hidden rounded-xl border">
          <div className="grid grid-cols-[1fr_1fr_1fr_32px] divide-x bg-muted/50 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            <div className="px-3 py-2">Field</div>
            <div className="px-3 py-2">Operator</div>
            <div className="px-3 py-2">Value</div>
            <div />
          </div>
          {whereConditions.map((condition) => {
            const field = getField(fieldCatalog, condition.field);
            const availableOperators = OPERATORS.filter((o) => !field || o.types.includes(field.type));
            return (
              <div key={condition.id} className="grid grid-cols-[1fr_1fr_1fr_32px] divide-x border-t">
                <div className="p-2">
                  <Select value={condition.field || undefined} onValueChange={(v) => updateWhere(condition.id, { field: v as string, value: "" })}>
                    <SelectTrigger size="sm" className="h-8 w-full"><SelectValue placeholder="Search fields..." /></SelectTrigger>
                    <SelectContent>
                      {fields.map((f) => (
                        <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-2">
                  <Select value={condition.operator} onValueChange={(v) => updateWhere(condition.id, { operator: v as Operator })}>
                    <SelectTrigger size="sm" className="h-8 w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {availableOperators.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-2">
                  <Input
                    type={field?.type === "number" || field?.type === "currency" || field?.type === "percentage" ? "number" : "text"}
                    value={condition.value}
                    onChange={(e) => updateWhere(condition.id, { value: e.target.value })}
                    placeholder="Value"
                    className="h-8 w-full text-sm"
                  />
                </div>
                <div className="flex items-center justify-center p-1">
                  <Button variant="ghost" size="icon-sm" disabled={whereConditions.length <= 1} onClick={() => removeWhere(condition.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <Button variant="outline" size="sm" onClick={addWhere} className="mt-2 h-7 gap-1.5 text-sm">
          <Plus className="size-3" /> Add Condition
        </Button>
      </div>

      {/* THEN */}
      <div>
        <h2 className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="rounded-md border border-emerald-500 bg-emerald-500/10 px-2 py-0.5 font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400">THEN</span>
        </h2>
        {thenAction && (
          <div className="space-y-3 rounded-xl border bg-background p-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="px-0.5 text-sm font-bold uppercase tracking-wider text-muted-foreground">Output Field</p>
                <OutputFieldPicker
                  value={thenAction.outputField ?? ""}
                  domain={domain}
                  rules={rules}
                  currentRuleId={currentRuleId}
                  onChange={(key) => updateThenAction({ outputField: key })}
                />
              </div>
              <div className="space-y-1">
                <p className="px-0.5 text-sm font-bold uppercase tracking-wider text-muted-foreground">Value</p>
                <Select value={valueType} onValueChange={(v) => changeValueType(v as ThenValueType)}>
                  <SelectTrigger size="sm" className="h-8 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bracket Lookup">Bracket Lookup</SelectItem>
                    <SelectItem value="Static Value">Static Value</SelectItem>
                    <SelectItem value="Formula / Expression">Formula / Expression</SelectItem>
                    <SelectItem value="Decision Matrix Lookup">Decision Matrix Lookup</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {valueType === "Bracket Lookup" && (
              <BracketRowsEditor
                brackets={thenAction.brackets ?? []}
                onChange={(brackets) => updateThenAction({ brackets, bracketField: whereConditions[0]?.field })}
              />
            )}
            {valueType === "Static Value" && (
              <Input
                placeholder="Value"
                value={thenAction.outputValue ?? ""}
                onChange={(e) => updateThenAction({ outputValue: e.target.value })}
                className="h-8 w-full text-sm"
              />
            )}
            {valueType === "Formula / Expression" && (
              <CalculateExpressionEditor
                value={thenAction.outputValue ?? ""}
                onChange={(outputValue) => updateThenAction({ outputValue })}
                domain={domain}
                rules={rules}
                currentRuleId={currentRuleId}
              />
            )}
            {valueType === "Decision Matrix Lookup" && (
              <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
                Configured via the Decision Matrix module — matrices for this domain are applied automatically during simulation.
              </p>
            )}
            {outputField?.unit && <p className="px-0.5 text-sm text-muted-foreground">Unit: {outputField.unit}</p>}
          </div>
        )}
      </div>

      {/* ELSE */}
      <div>
        <h2 className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="rounded-md border border-red-500 bg-red-500/10 px-2 py-0.5 font-mono text-sm font-bold text-red-700 dark:text-red-400">ELSE</span>
        </h2>
        <p className="mb-2 px-1 text-sm text-muted-foreground">
          Runs when no WHERE condition matches — defaults to Reject Application.
        </p>
        <ActionListEditor
          actions={elseActions ?? []}
          domain={domain}
          rules={rules}
          currentRuleId={currentRuleId}
          rootGroup={rootGroup}
          onChange={onElseActionsChange}
        />
      </div>
    </div>
  );
}
