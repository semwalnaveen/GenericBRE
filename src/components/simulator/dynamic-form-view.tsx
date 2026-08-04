"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, AlertCircle, CheckCircle2, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Field category definitions for enterprise grouping
export interface FieldCategory {
  id: string;
  name: string;
  keys: string[];
}

export const DOMAIN_CATEGORIES: FieldCategory[] = [
  {
    id: "applicant",
    name: "Applicant Details",
    keys: ["applicant_age", "gender", "city", "segment", "kyc_verified"],
  },
  {
    id: "income",
    name: "Income & Employment",
    keys: ["monthly_income", "employment_type", "employer_name", "other_income", "annual_income"],
  },
  {
    id: "loan",
    name: "Loan Details",
    keys: ["loan_amount", "ltv_requested", "ltv_ratio", "tenure_months", "interest_rate"],
  },
  {
    id: "collateral",
    name: "Collateral & Asset",
    keys: ["appraised_value", "purity_grade", "asset_type", "property_type"],
  },
  {
    id: "bureau",
    name: "Credit Bureau & Risk",
    keys: ["credit_score", "bureau_score", "delinquency_history", "credit_history_months"],
  },
  {
    id: "liabilities",
    name: "Existing Loans & Liabilities",
    keys: ["monthly_liabilities", "dti_ratio", "foir_ratio", "existing_loans_count"],
  },
];

export interface DynamicFormViewProps {
  jsonText: string;
  onUpdateJsonText: (newJson: string) => void;
  mappedFields?: string[];
  requiredFields?: string[];
}

export function DynamicFormView({
  jsonText,
  onUpdateJsonText,
  mappedFields = [],
  requiredFields = ["applicant_age", "monthly_income"],
}: DynamicFormViewProps) {
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "required" | "mapped" | "modified">("all");

  const parsedObj = useMemo(() => {
    try {
      return JSON.parse(jsonText || "{}");
    } catch {
      return null;
    }
  }, [jsonText]);

  if (!parsedObj) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
        The current JSON is invalid. Switch to the JSON view tab to resolve syntax errors.
      </div>
    );
  }

  const allEntries = Object.entries(parsedObj);

  const updateFieldValue = (key: string, rawValue: string) => {
    const updated = { ...parsedObj };
    const originalType = typeof updated[key];

    if (originalType === "number") {
      const num = Number(rawValue);
      updated[key] = Number.isNaN(num) ? rawValue : num;
    } else if (originalType === "boolean") {
      updated[key] = rawValue === "true";
    } else {
      updated[key] = rawValue;
    }

    onUpdateJsonText(JSON.stringify(updated, null, 2));
  };

  // Group entries into categories
  const categoryGroups = DOMAIN_CATEGORIES.map((cat) => {
    const categoryEntries = allEntries.filter(([k]) => {
      const inCategory = cat.keys.includes(k);
      if (!inCategory) return false;

      // Apply Search Filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const label = k.replace(/_/g, " ").toLowerCase();
        if (!k.toLowerCase().includes(q) && !label.includes(q)) return false;
      }

      // Apply Status Filter
      if (filterMode === "required" && !requiredFields.includes(k)) return false;
      if (filterMode === "mapped" && mappedFields.length > 0 && !mappedFields.includes(k)) return false;

      return true;
    });

    return { ...cat, entries: categoryEntries };
  });

  // Handle uncategorized overflow fields
  const assignedKeys = new Set(DOMAIN_CATEGORIES.flatMap((c) => c.keys));
  const uncategorizedEntries = allEntries.filter(([k]) => {
    if (assignedKeys.has(k)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!k.toLowerCase().includes(q)) return false;
    }
    if (filterMode === "required" && !requiredFields.includes(k)) return false;
    return true;
  });

  if (uncategorizedEntries.length > 0) {
    categoryGroups.push({
      id: "other",
      name: "Additional API Parameters",
      keys: uncategorizedEntries.map(([k]) => k),
      entries: uncategorizedEntries,
    });
  }

  return (
    <div className="space-y-3">
      {/* SEARCH AND FILTER TOOLBAR */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-40 flex-1">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search field by label or key (e.g. income, age)..."
            className="h-8 pl-8 text-xs bg-background"
          />
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant={filterMode === "all" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs px-2.5"
            onClick={() => setFilterMode("all")}
          >
            All ({allEntries.length})
          </Button>
          <Button
            variant={filterMode === "required" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs px-2.5"
            onClick={() => setFilterMode("required")}
          >
            Required
          </Button>
        </div>
      </div>

      {/* ACCORDION CATEGORIZED SECTIONS */}
      <Accordion type="multiple" defaultValue={["applicant"]} className="space-y-2">
        {categoryGroups.map((group) => {
          if (group.entries.length === 0) return null;
          return (
            <AccordionItem key={group.id} value={group.id} className="rounded-lg border bg-card px-3 py-1">
              <AccordionTrigger className="hover:no-underline py-2.5">
                <div className="flex items-center justify-between gap-2 w-full pr-2 text-left">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                    {group.name}
                    <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-mono">
                      {group.entries.length}
                    </Badge>
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-1 pb-3">
                {group.entries.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {group.entries.map(([key, val]) => {
                      const isRequired = requiredFields.includes(key);
                      const fieldLabel = key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

                      return (
                        <div key={key} className="space-y-1.5 rounded-lg border-0 bg-muted/10 p-2.5 text-xs transition-colors hover:bg-muted/20">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <label htmlFor={`field-${key}`} className="font-medium text-foreground truncate" title={fieldLabel}>
                                {fieldLabel}
                              </label>
                              {isRequired && (String(val ?? "").trim() === "") && <span className="text-destructive leading-none">*</span>}
                              <AnimatePresence>
                                {isRequired && (String(val ?? "").trim() !== "") && (
                                  <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    className="flex size-3.5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600"
                                  >
                                    <CheckCircle2 className="size-2.5" />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                            <span className="font-mono text-[10px] text-muted-foreground truncate max-w-28" title={key}>
                              {key}
                            </span>
                          </div>

                          {typeof val === "boolean" ? (
                            <Select value={String(val)} onValueChange={(v) => v && updateFieldValue(key, v)}>
                              <SelectTrigger id={`field-${key}`} size="sm" className="h-8 text-xs border-0 bg-muted/30 transition-all focus:bg-background focus:ring-1 focus:ring-primary/30">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">true (Yes)</SelectItem>
                                <SelectItem value="false">false (No)</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              id={`field-${key}`}
                              type={typeof val === "number" ? "number" : "text"}
                              value={String(val ?? "")}
                              onChange={(e) => updateFieldValue(key, e.target.value)}
                              className="h-8 text-xs font-mono border-0 bg-muted/30 transition-all focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-primary/30"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-2 italic">No fields in this section.</p>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
