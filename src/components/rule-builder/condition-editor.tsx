"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Trash2, Variable, Copy, CopyPlus, AlertCircle } from "lucide-react";
import { Condition, Domain, Operator } from "@/lib/types";
import { fieldsForDomain, getField, OPERATORS } from "@/lib/fields";
import { useAppStore } from "@/lib/store";
import { getGeneratedVariables } from "@/lib/rule-chaining";
import { recordRecentField } from "./builder-shared";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { MultiSelect } from "@/components/ui/multi-select";
import { cn } from "@/lib/utils";

const BOOLEAN_ITEMS = { true: "Yes", false: "No" };

export function ConditionEditor({
  condition,
  domain,
  currentRuleId,
  onChange,
  onDelete,
  onDuplicate,
  onCopy,
}: {
  condition: Condition;
  domain: Domain;
  /** The rule being edited, so its own outputs are excluded from its own
   *  "Generated Variables" list — rule chaining is global (see
   *  src/lib/rule-chaining.ts), not scoped to a group. Absent for Rule Templates. */
  currentRuleId?: string;
  onChange: (patch: Partial<Condition>) => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onCopy?: () => void;
}) {
  const fieldCatalog = useAppStore((s) => s.fieldCatalog);
  const rules = useAppStore((s) => s.rules);
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false);
  const fields = fieldsForDomain(fieldCatalog, domain);
  const variables = getGeneratedVariables(rules, currentRuleId);
  const field = getField(fieldCatalog, condition.field);
  const variable = variables.find((v) => v.key === condition.field);
  const availableOperators = OPERATORS.filter((o) => !field || o.types.includes(field.type));
  const fieldLabel = field?.label ?? variable?.key ?? "";

  const selectField = (key: string) => {
    recordRecentField(key);
    onChange({ field: key, value: "", value2: undefined });
    setFieldPickerOpen(false);
  };

  // Live, per-row validation while building — same checks validateTree runs
  // on Save, surfaced immediately so problems are visible as they're typed.
  // A row with no field yet stays neutral (it's just not configured, not
  // wrong); red only appears once configuration has started and is invalid.
  const isNumeric = field?.type === "number" || field?.type === "currency" || field?.type === "percentage";
  const issue = !condition.field
    ? null
    : condition.value === ""
      ? "Enter a value"
      : isNumeric && Number.isNaN(Number(condition.value))
        ? "Value must be a number"
        : condition.operator === "between" && (!condition.value2 || condition.value2 === "")
          ? 'Enter both values for "Between"'
          : condition.operator === "between" && isNumeric && Number.isNaN(Number(condition.value2))
            ? "Second value must be a number"
            : null;

  const renderValueInput = () => {
    if (field?.type === "boolean") {
      return (
        <Select items={BOOLEAN_ITEMS} value={condition.value || null} onValueChange={(v) => onChange({ value: v ?? "" })}>
          <SelectTrigger size="sm" className="h-8 w-28"><SelectValue placeholder="Value" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Yes</SelectItem>
            <SelectItem value="false">No</SelectItem>
          </SelectContent>
        </Select>
      );
    }
    if (field?.type === "enum" && field.options && condition.operator === "in") {
      const selected = condition.value ? condition.value.split(",").map((v) => v.trim()).filter(Boolean) : [];
      return (
        <MultiSelect
          label="Values"
          options={field.options.map((o) => ({ value: o, label: o }))}
          selected={selected}
          onChange={(values) => onChange({ value: values.join(", ") })}
          className="h-8 w-40"
        />
      );
    }
    if (field?.type === "enum" && field.options && condition.operator !== "in") {
      return (
        <Select value={condition.value || null} onValueChange={(v) => onChange({ value: v ?? "" })}>
          <SelectTrigger size="sm" className="h-8 w-40"><SelectValue placeholder="Value" /></SelectTrigger>
          <SelectContent>
            {field.options.map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    if (condition.operator === "between") {
      const betweenType = field?.type === "date" ? "date" : "number";
      return (
        <div className="flex items-center gap-1.5">
          <Input
            type={betweenType}
            value={condition.value}
            onChange={(e) => onChange({ value: e.target.value })}
            placeholder="From"
            className="h-8 w-20"
          />
          <span className="text-sm text-muted-foreground">–</span>
          <Input
            type={betweenType}
            value={condition.value2 ?? ""}
            onChange={(e) => onChange({ value2: e.target.value })}
            placeholder="To"
            className="h-8 w-20"
          />
        </div>
      );
    }
    return (
      <Input
        type={field?.type === "number" || field?.type === "currency" || field?.type === "percentage" ? "number" : field?.type === "date" ? "date" : "text"}
        value={condition.value}
        onChange={(e) => onChange({ value: e.target.value })}
        placeholder={condition.operator === "in" ? "value1, value2, ..." : "Value"}
        className="h-8 w-32"
      />
    );
  };

  return (
    <div className={cn("rounded-lg border bg-background px-2 py-1.5", issue && "border-destructive/50 ring-1 ring-destructive/20")}>
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-md border border-blue-500 bg-blue-500/5 px-2 py-1">
        <span className="text-sm font-bold text-blue-600">Condition:</span>
        <Select value={condition.prefix === "WHERE" ? "WHERE" : "IF"} onValueChange={(v) => onChange({ prefix: v as "IF" | "WHERE" })}>
          <SelectTrigger size="sm" className="h-7 w-24 border-0 bg-transparent">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="IF" className="font-semibold">IF</SelectItem>
            <SelectItem value="WHERE" className="font-semibold">WHERE</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Popover open={fieldPickerOpen} onOpenChange={setFieldPickerOpen}>
        <PopoverTrigger
          render={<Button variant="outline" size="sm" className="h-8 w-48 justify-between gap-1.5 font-normal" />}
        >
          <span className="flex min-w-0 items-center gap-1.5 truncate">
            {variable && <Variable className="size-3.5 shrink-0 text-primary" />}
            <span className="truncate">{fieldLabel || "Search fields..."}</span>
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-0">
          <Command>
            <CommandInput placeholder="Search fields..." />
            <CommandList>
              <CommandEmpty>No matching fields.</CommandEmpty>
              <CommandGroup heading="Business Fields">
                {fields.map((f) => (
                  <CommandItem key={f.key} value={f.label} onSelect={() => selectField(f.key)} className="gap-2">
                    <Check className={cn("size-3.5", condition.field === f.key ? "opacity-100" : "opacity-0")} />
                    {f.label}
                  </CommandItem>
                ))}
              </CommandGroup>
              {variables.length > 0 && (
                <CommandGroup heading="Generated Variables">
                  {variables.map((v) => (
                    <CommandItem key={v.key} value={v.key} onSelect={() => selectField(v.key)} className="gap-2">
                      <Check className={cn("size-3.5", condition.field === v.key ? "opacity-100" : "opacity-0")} />
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

      <Select
        items={Object.fromEntries(availableOperators.map((o) => [o.value, o.label]))}
        value={condition.operator}
        onValueChange={(v) => onChange({ operator: v as Operator })}
      >
        <SelectTrigger size="sm" className="h-8 w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableOperators.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {renderValueInput()}
      {field?.unit && <span className="text-sm text-muted-foreground">{field.unit}</span>}

      <div className="ml-auto flex items-center">
        {onCopy && (
          <Button variant="ghost" size="icon-sm" title="Copy condition" onClick={onCopy} className="text-muted-foreground">
            <Copy className="size-3.5" />
          </Button>
        )}
        {onDuplicate && (
          <Button variant="ghost" size="icon-sm" title="Duplicate condition" onClick={onDuplicate} className="text-muted-foreground">
            <CopyPlus className="size-3.5" />
          </Button>
        )}
        <Button variant="ghost" size="icon-sm" title="Delete condition" onClick={onDelete} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
    {issue && (
      <p className="mt-1 flex items-center gap-1 px-0.5 text-sm text-destructive">
        <AlertCircle className="size-3 shrink-0" /> {issue}
      </p>
    )}
    </div>
  );
}
