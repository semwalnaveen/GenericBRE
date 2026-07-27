"use client";

import { BusinessRule, Domain } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

interface MetadataFormProps {
  data: Pick<BusinessRule, "id" | "name" | "domain" | "category" | "status" | "description">;
  onChange: (patch: Partial<BusinessRule>) => void;
  errors?: Record<string, string>;
}

export function MetadataForm({ data, onChange, errors = {} }: MetadataFormProps) {
  const industries = useAppStore((s) => s.industries);
  const ruleCategories = useAppStore((s) => s.ruleCategories);

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label className={cn(errors.name && "text-destructive")}>Rule Name *</Label>
          <Input
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="e.g. Minimum Credit Score Validation"
            className={cn(errors.name && "border-destructive")}
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Rule ID</Label>
          <Input value={data.id} disabled className="font-mono text-muted-foreground" />
        </div>

        <div className="space-y-1.5">
          <Label className={cn(errors.category && "text-destructive")}>Category *</Label>
          <Select value={data.category} onValueChange={(v) => onChange({ category: v ?? "" })}>
            <SelectTrigger className={cn("w-full", errors.category && "border-destructive")}><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {ruleCategories.map((c) => (
                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Status</Label>
          <div className="flex h-9 items-center">
            <StatusBadge status={data.status} />
          </div>
        </div>

        <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
          <Label>Description</Label>
          <Textarea
            value={data.description ?? ""}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Explain the business purpose of this rule for future maintainers..."
            className="min-h-16"
          />
        </div>
      </div>
    </div>
  );
}
