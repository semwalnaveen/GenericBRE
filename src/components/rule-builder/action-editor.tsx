"use client";

import { useState } from "react";
import { Plus, Trash2, CheckCircle2, XCircle, Calculator, Tag, MessageSquare, Flag, ChevronsUpDown, Check, Variable, Sparkles, ListOrdered } from "lucide-react";
import { ActionType, BusinessRule, ConditionGroup, Domain, FieldDataType, RuleAction, RuleBracket } from "@/lib/types";
import { CalculateExpressionEditor } from "@/components/rule-builder/calculate-expression-editor";
import { fieldsForDomain, getField } from "@/lib/fields";
import { getGeneratedVariables } from "@/lib/rule-chaining";
import { useAppStore } from "@/lib/store";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const ACTION_TYPES: { value: ActionType; label: string; icon: React.ElementType; accent: string }[] = [
  { value: "Approve", label: "Approve", icon: CheckCircle2, accent: "text-emerald-600 dark:text-emerald-400" },
  { value: "Reject", label: "Reject", icon: XCircle, accent: "text-red-600 dark:text-red-400" },
  { value: "Calculate", label: "Calculate", icon: Calculator, accent: "text-blue-600 dark:text-blue-400" },
  { value: "Assign Value", label: "Assign Value", icon: Tag, accent: "text-violet-600 dark:text-violet-400" },
  { value: "Show Message", label: "Show Message", icon: MessageSquare, accent: "text-amber-600 dark:text-amber-400" },
  { value: "Flag for Review", label: "Flag for Review", icon: Flag, accent: "text-orange-600 dark:text-orange-400" },
  { value: "Bracket Lookup", label: "Bracket Lookup", icon: ListOrdered, accent: "text-cyan-600 dark:text-cyan-400" },
];

const OUTPUT_TYPES: { value: FieldDataType; label: string }[] = [
  { value: "number", label: "Number" },
  { value: "currency", label: "Currency" },
  { value: "percentage", label: "Percentage" },
  { value: "boolean", label: "Boolean" },
  { value: "string", label: "String" },
  { value: "date", label: "Date" },
];

function slugify(text: string) {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

// Dynamic, metadata-driven Output Field selector — Business Fields (from the
// Field Catalog) and Generated Variables (other rules' Calculate/Assign
// Value outputs — rule chaining is global, see src/lib/rule-chaining.ts) are
// offered as suggestions, but typing a name that matches neither lets a
// Business Analyst define a brand-new variable on the spot (e.g. "Eligible
// Amount") — this stays a free-text field with autocomplete, not a strict picker.
export function OutputFieldPicker({
  value,
  domain,
  rules,
  currentRuleId,
  onChange,
}: {
  value: string;
  domain: Domain;
  rules: BusinessRule[];
  currentRuleId?: string;
  onChange: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const fieldCatalog = useAppStore((s) => s.fieldCatalog);
  const fields = fieldsForDomain(fieldCatalog, domain);
  const variables = getGeneratedVariables(rules, currentRuleId);
  const field = getField(fieldCatalog, value);
  const variable = variables.find((v) => v.key === value);
  const label = field?.label ?? variable?.key ?? value;

  const trimmed = search.trim();
  const exactMatch =
    fields.some((f) => f.key === trimmed || f.label.toLowerCase() === trimmed.toLowerCase()) ||
    variables.some((v) => v.key === trimmed);
  const canCreate = trimmed.length > 0 && !exactMatch;

  const select = (key: string) => {
    onChange(key);
    setSearch("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" size="sm" className="h-8 w-full justify-between gap-1.5 font-normal" />}>
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          {variable && <Variable className="size-3.5 shrink-0 text-primary" />}
          <span className="truncate">{value ? label : "Output field..."}</span>
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Search or type a new name..." value={search} onValueChange={setSearch} />
          <CommandList>
            {!canCreate && <CommandEmpty>No matching fields.</CommandEmpty>}
            {canCreate && (
              <CommandGroup heading="New Variable">
                <CommandItem value={`__create__${trimmed}`} onSelect={() => select(slugify(trimmed))} className="gap-2">
                  <Sparkles className="size-3.5 shrink-0 text-primary" />
                  Create &quot;{trimmed}&quot;
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup heading="Business Fields">
              {fields.map((f) => (
                <CommandItem key={f.key} value={f.label} onSelect={() => select(f.key)} className="gap-2">
                  <Check className={cn("size-3.5", value === f.key ? "opacity-100" : "opacity-0")} />
                  {f.label}
                </CommandItem>
              ))}
            </CommandGroup>
            {variables.length > 0 && (
              <CommandGroup heading="Generated Variables">
                {variables.map((v) => (
                  <CommandItem key={v.key} value={v.key} onSelect={() => select(v.key)} className="gap-2">
                    <Check className={cn("size-3.5", value === v.key ? "opacity-100" : "opacity-0")} />
                    <Variable className="size-3.5 shrink-0 text-primary" />
                    <span className="truncate">{v.key}</span>
                    <span className="ml-auto shrink-0 text-sm text-muted-foreground">from {v.sourceRuleName}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Range rows for a "Bracket Lookup" action — e.g. credit score 750-799 -> 8.75.
// Mirrors the add/remove pattern already used for the actions list itself.
function BracketRowsEditor({ brackets, onChange }: { brackets: RuleBracket[]; onChange: (brackets: RuleBracket[]) => void }) {
  const addRow = () => onChange([...brackets, { id: `bkt-${Date.now()}`, min: 0, max: 0, outputValue: "" }]);
  const updateRow = (id: string, patch: Partial<RuleBracket>) =>
    onChange(brackets.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const removeRow = (id: string) => onChange(brackets.filter((b) => b.id !== id));

  return (
    <div className="space-y-1.5 sm:col-span-2">
      {brackets.map((b) => (
        <div key={b.id} className="flex items-center gap-1.5">
          <Input
            type="number"
            placeholder="Min"
            value={b.min}
            onChange={(e) => updateRow(b.id, { min: Number(e.target.value) })}
            className="h-8 w-24 text-sm"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="number"
            placeholder="Max"
            value={b.max}
            onChange={(e) => updateRow(b.id, { max: Number(e.target.value) })}
            className="h-8 w-24 text-sm"
          />
          <span className="text-sm text-muted-foreground">→</span>
          <Input
            placeholder="Output value"
            value={b.outputValue}
            onChange={(e) => updateRow(b.id, { outputValue: e.target.value })}
            className="h-8 flex-1 text-sm"
          />
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

function ActionRow({
  action,
  domain,
  rules,
  currentRuleId,
  rootGroup,
  priorActions,
  onChange,
  onDelete,
}: {
  action: RuleAction;
  domain: Domain;
  rules: BusinessRule[];
  currentRuleId?: string;
  rootGroup?: ConditionGroup;
  priorActions?: RuleAction[];
  onChange: (patch: Partial<RuleAction>) => void;
  onDelete: () => void;
}) {
  const meta = ACTION_TYPES.find((t) => t.value === action.type)!;
  const needsOutput = action.type === "Calculate" || action.type === "Assign Value";
  const needsMessage = action.type === "Show Message" || action.type === "Flag for Review" || action.type === "Approve" || action.type === "Reject";
  const needsBrackets = action.type === "Bracket Lookup";
  const fieldCatalog = useAppStore((s) => s.fieldCatalog);
  const bracketFields = fieldsForDomain(fieldCatalog, domain);

  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="flex items-center gap-2">
        <meta.icon className={cn("size-4", meta.accent)} />
        <Select value={action.type} onValueChange={(v) => onChange({ type: v as ActionType })}>
          <SelectTrigger size="sm" className="h-8 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTION_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon-sm" onClick={onDelete} className="ml-auto text-muted-foreground hover:text-destructive">
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {needsOutput && (
          <>
            <OutputFieldPicker
              value={action.outputField ?? ""}
              domain={domain}
              rules={rules}
              currentRuleId={currentRuleId}
              onChange={(key) => onChange({ outputField: key })}
            />
            <Select
              value={action.outputType ?? "number"}
              onValueChange={(v) => onChange({ outputType: v as FieldDataType })}
            >
              <SelectTrigger size="sm" className="h-8 w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {OUTPUT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {action.type === "Calculate" ? (
              <CalculateExpressionEditor
                value={action.outputValue ?? ""}
                onChange={(outputValue) => onChange({ outputValue })}
                domain={domain}
                rules={rules}
                currentRuleId={currentRuleId}
                rootGroup={rootGroup}
                priorActions={priorActions}
              />
            ) : (
              <Input
                placeholder="Value"
                value={action.outputValue ?? ""}
                onChange={(e) => onChange({ outputValue: e.target.value })}
                className="h-8 flex-1 text-sm sm:col-span-2"
              />
            )}
          </>
        )}
        {needsBrackets && (
          <>
            <Select value={action.bracketField ?? ""} onValueChange={(v) => onChange({ bracketField: (v as string) ?? "" })}>
              <SelectTrigger size="sm" className="h-8 w-full"><SelectValue placeholder="Field to test..." /></SelectTrigger>
              <SelectContent>
                {bracketFields.map((f) => (
                  <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <OutputFieldPicker
              value={action.outputField ?? ""}
              domain={domain}
              rules={rules}
              currentRuleId={currentRuleId}
              onChange={(key) => onChange({ outputField: key })}
            />
            <BracketRowsEditor
              brackets={action.brackets ?? []}
              onChange={(brackets) => onChange({ brackets })}
            />
          </>
        )}
        {needsMessage && (
          <Textarea
            placeholder="Message shown to the business user / audit trail"
            value={action.message ?? ""}
            onChange={(e) => onChange({ message: e.target.value })}
            className="min-h-14 text-sm sm:col-span-2"
          />
        )}
      </div>
    </div>
  );
}

export function ActionListEditor({
  actions,
  domain,
  rules,
  currentRuleId,
  rootGroup,
  onChange,
}: {
  actions: RuleAction[];
  domain: Domain;
  rules: BusinessRule[];
  currentRuleId?: string;
  rootGroup?: ConditionGroup;
  onChange: (actions: RuleAction[]) => void;
}) {
  const addAction = () => {
    onChange([...actions, { id: `act-${Date.now()}`, type: "Approve" }]);
  };
  const updateAction = (id: string, patch: Partial<RuleAction>) => {
    onChange(actions.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };
  const deleteAction = (id: string) => onChange(actions.filter((a) => a.id !== id));

  return (
    <div className="space-y-2.5">
      {actions.length === 0 && (
        <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
          No actions configured — add at least one THEN action.
        </p>
      )}
      {actions.map((a, index) => (
        <ActionRow
          key={a.id}
          action={a}
          domain={domain}
          rules={rules}
          currentRuleId={currentRuleId}
          rootGroup={rootGroup}
          priorActions={actions.slice(0, index)}
          onChange={(patch) => updateAction(a.id, patch)}
          onDelete={() => deleteAction(a.id)}
        />
      ))}
      <Button variant="outline" size="sm" onClick={addAction} className="gap-1.5">
        <Plus className="size-3.5" /> Add Action
      </Button>
    </div>
  );
}
