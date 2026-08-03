"use client";

import { Fragment } from "react";
import { Code2 } from "lucide-react";
import { BusinessField, Condition, ConditionGroup } from "@/lib/types";
import { getField } from "@/lib/fields";
import { treeStats, effectiveConnector } from "@/lib/condition-tree";
import { cn } from "@/lib/utils";

// Read-only SQL-ish rendering of the condition tree (PRD: "preview only, do
// not require users to edit SQL") — the same tree the engine evaluates,
// pretty-printed so grouping and AND/OR precedence are unmistakable.

function Keyword({ children }: { children: React.ReactNode }) {
  return <span className="font-bold text-primary">{children}</span>;
}

function Value({ children }: { children: React.ReactNode }) {
  return <span className="text-emerald-600 dark:text-emerald-400">{children}</span>;
}

function quoteIfText(value: string, field?: BusinessField): React.ReactNode {
  const numeric = field?.type === "number" || field?.type === "currency" || field?.type === "percentage";
  const boolLike = field?.type === "boolean" || value === "true" || value === "false";
  if (numeric || boolLike) return <Value>{value || "…"}</Value>;
  return <Value>&apos;{value || "…"}&apos;</Value>;
}

function ConditionText({ condition, catalog }: { condition: Condition; catalog: BusinessField[] }) {
  const field = getField(catalog, condition.field);
  const label = <span className="text-foreground">{field?.label ?? condition.field ?? "…"}</span>;
  switch (condition.operator) {
    case "between":
      return (
        <>
          {label} <Keyword>BETWEEN</Keyword> {quoteIfText(condition.value, field)} <Keyword>AND</Keyword>{" "}
          {quoteIfText(condition.value2 ?? "", field)}
        </>
      );
    case "in": {
      const values = condition.value.split(",").map((v) => v.trim()).filter(Boolean);
      return (
        <>
          {label} <Keyword>IN</Keyword> (
          {values.length === 0
            ? quoteIfText("", field)
            : values.map((v, i) => (
                <Fragment key={i}>
                  {i > 0 && ", "}
                  {quoteIfText(v, field)}
                </Fragment>
              ))}
          )
        </>
      );
    }
    case "contains":
      return (
        <>
          {label} <Keyword>CONTAINS</Keyword> {quoteIfText(condition.value, field)}
        </>
      );
    case "starts_with":
      return (
        <>
          {label} <Keyword>STARTS WITH</Keyword> {quoteIfText(condition.value, field)}
        </>
      );
    default:
      return (
        <>
          {label} {condition.operator} {quoteIfText(condition.value, field)}
        </>
      );
  }
}

// Nested groups render inline with parentheses; the root gets one child per
// line joined by its connector — matching how a reviewed SQL WHERE clause is
// conventionally formatted.
function GroupInline({ group, catalog }: { group: ConditionGroup; catalog: BusinessField[] }) {
  if (group.children.length === 0) return <span className="text-muted-foreground">TRUE</span>;
  return (
    <>
      {group.children.map((child, i) => {
        const connector = effectiveConnector(group, i);
        const excluded = connector === "N.A.";
        return (
          <Fragment key={child.id}>
            {i > 0 &&
              (excluded ? (
                <span className="text-muted-foreground/70 italic"> N.A. </span>
              ) : (
                <>
                  {" "}
                  <Keyword>{connector}</Keyword>{" "}
                </>
              ))}
            <span className={cn(excluded && "text-muted-foreground/50 line-through decoration-1")}>
              {child.type === "condition" ? (
                <ConditionText condition={child} catalog={catalog} />
              ) : (
                <>
                  (<GroupInline group={child} catalog={catalog} />)
                </>
              )}
            </span>
          </Fragment>
        );
      })}
    </>
  );
}

export function ExpressionPreview({ rootGroup, catalog }: { rootGroup: ConditionGroup; catalog: BusinessField[] }) {
  const stats = treeStats(rootGroup);
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center gap-1.5 border-b px-3.5 py-2.5 text-sm font-semibold">
        <Code2 className="size-3.5 text-primary" /> Expression Preview
      </div>
      <div className="whitespace-pre-wrap break-words px-3.5 py-3 font-mono text-sm leading-relaxed">
        <Keyword>WHERE</Keyword>{" "}
        {rootGroup.children.length === 0 ? (
          <span className="text-muted-foreground">— no conditions, matches every case</span>
        ) : (
          rootGroup.children.map((child, i) => {
            const connector = effectiveConnector(rootGroup, i);
            const excluded = connector === "N.A.";
            return (
              <Fragment key={child.id}>
                {i > 0 && (
                  <>
                    {"\n"}
                    {"  "}
                    {excluded ? <span className="text-muted-foreground/70 italic">N.A.</span> : <Keyword>{connector}</Keyword>}{" "}
                  </>
                )}
                <span className={cn(excluded && "text-muted-foreground/50 line-through decoration-1")}>
                  {child.type === "condition" ? (
                    <>
                      (<ConditionText condition={child} catalog={catalog} />)
                    </>
                  ) : (
                    <>
                      (<GroupInline group={child} catalog={catalog} />)
                    </>
                  )}
                </span>
              </Fragment>
            );
          })
        )}
      </div>
      <div className="grid grid-cols-6 divide-x border-t text-center">
        {(
          [
            ["Conditions", stats.conditions],
            ["Groups", stats.groups],
            ["AND", stats.andCount],
            ["OR", stats.orCount],
            ["N.A.", stats.naCount],
            ["Depth", stats.maxDepth],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="px-1 py-2">
            <p className="text-sm font-bold tabular-nums">{value}</p>
            <p className="text-sm uppercase tracking-wide text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
