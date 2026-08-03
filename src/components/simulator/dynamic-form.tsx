"use client";

import { Domain } from "@/lib/types";
import { fieldsForDomain, getField } from "@/lib/fields";
import { useAppStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type SimValues = Record<string, string | number | boolean>;

export function DynamicForm({
  domain,
  values,
  onChange,
}: {
  domain: Domain;
  values: SimValues;
  onChange: (key: string, value: string | number | boolean) => void;
}) {
  const fieldCatalog = useAppStore((s) => s.fieldCatalog);
  const keys = fieldsForDomain(fieldCatalog, domain)
    .filter((f) => !f.computed)
    .map((f) => f.key);

  return (
    <div className="grid grid-cols-2 gap-3">
      {keys.map((key) => {
        const field = getField(fieldCatalog, key);
        if (!field) return null;
        const value = values[key];

        return (
          <div key={key} className="space-y-1">
            <Label className="text-sm text-muted-foreground">{field.label}{field.unit ? ` (${field.unit})` : ""}</Label>
            {field.type === "boolean" ? (
              <Select
                items={{ true: "Yes", false: "No" }}
                value={value === undefined ? undefined : String(value)}
                onValueChange={(v) => onChange(key, v === "true")}
              >
                <SelectTrigger size="sm" className="h-9 w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            ) : field.type === "enum" && field.options ? (
              <Select
                items={Object.fromEntries(field.options.map((o) => [o, o]))}
                value={value === undefined ? undefined : String(value)}
                onValueChange={(v) => onChange(key, v as string)}
              >
                <SelectTrigger size="sm" className="h-9 w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {field.options.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={field.type === "number" || field.type === "currency" || field.type === "percentage" ? "number" : "text"}
                value={value === undefined ? "" : String(value)}
                onChange={(e) =>
                  onChange(key, field.type === "number" || field.type === "currency" || field.type === "percentage" ? Number(e.target.value) : e.target.value)
                }
                className="h-9"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
