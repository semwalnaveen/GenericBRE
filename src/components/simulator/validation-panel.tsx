"use client";

import { useMemo } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface ValidationError {
  fieldKey: string;
  fieldLabel: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationPanelProps {
  jsonText: string;
  mappedFields?: string[];
  requiredFields?: string[];
}

export function validateSimulatorInput(
  jsonText: string,
  requiredFields: string[] = ["applicant_age", "monthly_income"]
): ValidationError[] {
  const errors: ValidationError[] = [];

  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(jsonText || "{}");
  } catch (err) {
    errors.push({
      fieldKey: "json_syntax",
      fieldLabel: "JSON Payload",
      message: "Malformed JSON syntax — check quotes and commas.",
      severity: "error",
    });
    return errors;
  }

  // Check required fields
  for (const req of requiredFields) {
    if (parsed[req] === undefined || parsed[req] === null || parsed[req] === "") {
      errors.push({
        fieldKey: req,
        fieldLabel: req.replace(/_/g, " ").toUpperCase(),
        message: `Required field '${req}' is missing or empty.`,
        severity: "error",
      });
    }
  }

  // Check numeric boundaries
  if (typeof parsed.applicant_age === "number" && (parsed.applicant_age < 18 || parsed.applicant_age > 100)) {
    errors.push({
      fieldKey: "applicant_age",
      fieldLabel: "Applicant Age",
      message: "Applicant Age is out of realistic lending bounds (18–100).",
      severity: "warning",
    });
  }

  if (typeof parsed.monthly_income === "number" && parsed.monthly_income < 0) {
    errors.push({
      fieldKey: "monthly_income",
      fieldLabel: "Monthly Income",
      message: "Monthly Income cannot be negative.",
      severity: "error",
    });
  }

  if (typeof parsed.credit_score === "number" && (parsed.credit_score < 300 || parsed.credit_score > 900)) {
    errors.push({
      fieldKey: "credit_score",
      fieldLabel: "Credit Score",
      message: "Credit score is outside CIBIL/Experian range (300–900).",
      severity: "warning",
    });
  }

  return errors;
}

export function ValidationPanel({ jsonText, requiredFields }: ValidationPanelProps) {
  const errors = useMemo(
    () => validateSimulatorInput(jsonText, requiredFields),
    [jsonText, requiredFields]
  );

  const errorCount = errors.filter((e) => e.severity === "error").length;
  const warningCount = errors.filter((e) => e.severity === "warning").length;

  if (errors.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
        <span className="font-semibold">Pre-Flight Validation Passed</span>
        <span className="text-muted-foreground">— All required fields present & data types valid.</span>
      </div>
    );
  }

  return (
    <div className={errorCount > 0 ? "rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-2 text-xs" : "rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 space-y-2 text-xs"}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          {errorCount > 0 ? (
            <ShieldAlert className="size-4 text-destructive" />
          ) : (
            <AlertTriangle className="size-4 text-amber-500" />
          )}
          <span>Pre-Flight Validation Warnings</span>
        </div>
        <div className="flex items-center gap-1.5">
          {errorCount > 0 && <Badge variant="destructive" className="h-5 text-[10px]">{errorCount} Errors</Badge>}
          {warningCount > 0 && <Badge variant="secondary" className="h-5 text-[10px] bg-amber-500/10 text-amber-600 border-0">{warningCount} Warnings</Badge>}
        </div>
      </div>

      <ul className="space-y-1 pl-1">
        {errors.map((err, idx) => (
          <li key={idx} className="flex items-start gap-1.5">
            {err.severity === "error" ? (
              <AlertCircle className="size-3.5 shrink-0 text-destructive mt-0.5" />
            ) : (
              <AlertTriangle className="size-3.5 shrink-0 text-amber-500 mt-0.5" />
            )}
            <div>
              <span className="font-semibold text-foreground">{err.fieldLabel}: </span>
              <span className="text-muted-foreground">{err.message}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
