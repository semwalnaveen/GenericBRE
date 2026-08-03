"use client";

import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { ChevronDown, History, RotateCcw, Boxes, Variable, MessageSquare, CheckCheck, Clock, ScrollText } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { StatusBadge, PriorityBadge } from "@/components/status-badge";
import {
  ApprovalRequest,
  AuditEntry,
  BusinessField,
  BusinessRule,
  Condition,
  ConditionGroup,
  Product,
  ProductRuleMapping,
  RuleAction,
  RuleVersion,
} from "@/lib/types";
import { getField } from "@/lib/fields";
import { flattenConditions } from "@/lib/conflict-detection";
import { effectiveConnector } from "@/lib/condition-tree";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

// This rule's own generated variables — every Calculate/Assign Value/Bracket
// Lookup output it produces (mirrors rule-chaining.ts's getGeneratedVariables,
// which deliberately excludes the rule being viewed since that function is
// scoped to "what can OTHER rules reference" — here we want the opposite).
function ownGeneratedVariables(rule: BusinessRule): { key: string; type: RuleAction["type"] }[] {
  const out: { key: string; type: RuleAction["type"] }[] = [];
  const seen = new Set<string>();
  for (const a of [...rule.actions, ...(rule.elseActions ?? [])]) {
    if ((a.type === "Assign Value" || a.type === "Calculate" || a.type === "Bracket Lookup") && a.outputField && !seen.has(a.outputField)) {
      seen.add(a.outputField);
      out.push({ key: a.outputField, type: a.type });
    }
  }
  return out;
}

function describeCondition(c: Condition, catalog: BusinessField[]): string {
  const label = getField(catalog, c.field)?.label ?? c.field;
  return `${label} ${c.operator} ${c.value}${c.value2 ? ` – ${c.value2}` : ""}`;
}

function describeAction(a: RuleVersion["actions"][number]): string {
  let s = a.type;
  if (a.message) s += ` — ${a.message}`;
  if (a.outputField) s += ` — set ${a.outputField} = ${a.outputValue}`;
  return s;
}

const META_FIELDS: { key: keyof RuleVersion; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "category", label: "Category" },
  { key: "subCategory", label: "Sub-category" },
  { key: "priority", label: "Priority" },
  // { key: "owner", label: "Owner" }, // FUTURE: restore when Owner is reintroduced
  { key: "description", label: "Description" },
];

function diffVersions(prev: RuleVersion | undefined, curr: RuleVersion, catalog: BusinessField[]) {
  const metaChanges = META_FIELDS.map(({ key, label }) => ({ label, before: prev?.[key], after: curr[key] })).filter(
    (m) => prev !== undefined && m.before !== m.after
  );

  const prevConds = prev ? flattenConditions(prev.rootGroup).map((c) => describeCondition(c, catalog)) : [];
  const currConds = flattenConditions(curr.rootGroup).map((c) => describeCondition(c, catalog));
  const conditionsAdded = currConds.filter((c) => !prevConds.includes(c));
  const conditionsRemoved = prevConds.filter((c) => !currConds.includes(c));

  const prevActions = (prev?.actions ?? []).map((a) => `THEN: ${describeAction(a)}`);
  const currActions = curr.actions.map((a) => `THEN: ${describeAction(a)}`);
  const prevElse = (prev?.elseActions ?? []).map((a) => `ELSE: ${describeAction(a)}`);
  const currElse = (curr.elseActions ?? []).map((a) => `ELSE: ${describeAction(a)}`);
  const actionsAdded = [...currActions, ...currElse].filter((a) => ![...prevActions, ...prevElse].includes(a));
  const actionsRemoved = [...prevActions, ...prevElse].filter((a) => ![...currActions, ...currElse].includes(a));

  return { metaChanges, conditionsAdded, conditionsRemoved, actionsAdded, actionsRemoved };
}

function GroupView({ group, depth = 0, catalog }: { group: ConditionGroup; depth?: number; catalog: BusinessField[] }) {
  if (group.children.length === 0) {
    return <p className="text-sm italic text-muted-foreground">Always applies (no conditions)</p>;
  }
  return (
    <div className={cn("space-y-1.5", depth > 0 && "border-l-2 pl-3")}>
      {group.children.map((child, i) => {
        const connector = effectiveConnector(group, i);
        const excluded = connector === "N.A.";
        return (
          <div key={child.id} className={cn(excluded && "opacity-50")}>
            {i > 0 && (
              <p className="my-1 text-sm font-bold uppercase tracking-wide text-primary/70">
                {excluded ? "N.A. (excluded)" : connector}
              </p>
            )}
            {child.type === "condition" ? (
              <div className={cn("rounded-md border bg-muted/30 px-2.5 py-1.5 text-sm", excluded && "line-through decoration-1")}>
                <span className="font-medium">{getField(catalog, child.field)?.label ?? child.field}</span>{" "}
                <span className="text-muted-foreground">{child.operator}</span>{" "}
                <span className="font-mono">{child.value}{child.value2 ? ` – ${child.value2}` : ""}</span>
              </div>
            ) : (
              <GroupView group={child} depth={depth + 1} catalog={catalog} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ActionRowList({ actions }: { actions: RuleAction[] }) {
  return (
    <div className="space-y-1.5">
      {actions.map((a) => (
        <div key={a.id} className="rounded-md border bg-muted/30 px-2.5 py-1.5 text-sm">
          <span className="font-medium">{a.type}</span>
          {a.message && <span className="text-muted-foreground"> — {a.message}</span>}
          {a.outputField && (
            <span className="text-muted-foreground">
              {" "}
              — set <span className="font-mono">{a.outputField}</span> = <span className="font-mono">{a.outputValue}</span>
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function ProductMappingSection({
  rule,
  products,
  mappings,
}: {
  rule: BusinessRule;
  products: Product[];
  mappings: ProductRuleMapping[];
}) {
  const rows = useMemo(
    () =>
      mappings
        .filter((m) => m.ruleId === rule.id)
        .map((m) => ({ mapping: m, product: products.find((p) => p.id === m.productId) }))
        .sort((a, b) => (a.mapping.order ?? 999) - (b.mapping.order ?? 999)),
    [mappings, products, rule.id]
  );

  return (
    <>
      <Separator />
      <div className="py-4">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Boxes className="size-3.5" /> Product Mapping &amp; Sequence
        </p>
        {rows.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">Not yet mapped to any product.</p>
        ) : (
          <div className="space-y-2">
            {rows.map(({ mapping, product }) => (
              <div key={mapping.id} className="rounded-md border bg-muted/30 px-2.5 py-1.5 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{product?.name ?? mapping.productId}</span>
                  {mapping.order !== undefined && (
                    <Badge variant="outline" className="font-mono">Sequence #{mapping.order}</Badge>
                  )}
                  {!mapping.active && <Badge variant="outline">Inactive</Badge>}
                  {mapping.effectiveDate && (
                    <span className="text-muted-foreground">
                      Effective {new Date(mapping.effectiveDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {mapping.remarks && (
                  <p className="mt-1.5 flex items-start gap-1.5 text-muted-foreground">
                    <MessageSquare className="mt-0.5 size-3.5 shrink-0" />
                    <span className="whitespace-pre-wrap">{mapping.remarks}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function GeneratedVariablesSection({ rule }: { rule: BusinessRule }) {
  const vars = useMemo(() => ownGeneratedVariables(rule), [rule]);
  if (vars.length === 0) return null;
  return (
    <>
      <Separator />
      <div className="py-4">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Variable className="size-3.5" /> Generated Variables
        </p>
        <div className="flex flex-wrap gap-1.5">
          {vars.map((v) => (
            <span key={v.key} className="rounded-md border bg-muted/30 px-2 py-1 text-sm">
              <span className="font-mono font-medium">{v.key}</span>{" "}
              <span className="text-muted-foreground">via {v.type}</span>
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

function ApprovalTimelineSection({ rule, approvalRequests }: { rule: BusinessRule; approvalRequests: ApprovalRequest[] }) {
  const requests = useMemo(
    () =>
      approvalRequests
        .filter((a) => a.ruleId === rule.id)
        .sort((a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime()),
    [approvalRequests, rule.id]
  );
  if (requests.length === 0) return null;

  return (
    <>
      <Separator />
      <div className="py-4">
        <Accordion defaultValue={["approval-timeline"]}>
          <AccordionItem value="approval-timeline">
            <AccordionTrigger className="text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline">
              <span className="flex items-center gap-1.5">
                <CheckCheck className="size-3.5" /> Approval Timeline
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {requests.map((a) => (
                  <div key={a.id} className="rounded-md border bg-muted/30 px-2.5 py-1.5 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={a.stage === "Approved" ? "default" : a.stage === "Rejected" ? "destructive" : "outline"}>
                        {a.stage}
                      </Badge>
                      <span className="text-muted-foreground">
                        Submitted by <span className="font-medium text-foreground">{a.requestedBy}</span> ·{" "}
                        {new Date(a.requestedAt).toLocaleString()}
                      </span>
                    </div>
                    {a.decidedBy && (
                      <p className="mt-1 text-muted-foreground">
                        Decided by <span className="font-medium text-foreground">{a.decidedBy}</span>
                        {a.decidedAt && <> · {new Date(a.decidedAt).toLocaleString()}</>}
                      </p>
                    )}
                    {a.comment && (
                      <p className="mt-1.5 flex items-start gap-1.5">
                        <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                        <span className="whitespace-pre-wrap">{a.comment}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </>
  );
}

function AuditTimelineSection({ rule, auditLog }: { rule: BusinessRule; auditLog: AuditEntry[] }) {
  const entries = useMemo(
    () =>
      auditLog
        .filter((e) => e.entityId === rule.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [auditLog, rule.id]
  );
  if (entries.length === 0) return null;

  return (
    <>
      <Separator />
      <div className="py-4">
        <Accordion>
          <AccordionItem value="audit-timeline">
            <AccordionTrigger className="text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline">
              <span className="flex items-center gap-1.5">
                <ScrollText className="size-3.5" /> Audit Timeline ({entries.length})
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {entries.map((e) => (
                  <div key={e.id} className="rounded-md border bg-muted/30 px-2.5 py-1.5 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{e.action}</span>
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        by {e.user} · <Clock className="size-3 shrink-0" />
                        {formatDistanceToNow(new Date(e.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="mt-1 text-muted-foreground">{e.details}</p>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </>
  );
}

function VersionHistorySection({ rule, catalog }: { rule: BusinessRule; catalog: BusinessField[] }) {
  const allVersions = useAppStore((s) => s.ruleVersions);
  const restoreRuleVersion = useAppStore((s) => s.restoreRuleVersion);
  const versions = useMemo(
    () => allVersions.filter((v) => v.ruleId === rule.id).sort((a, b) => b.version - a.version),
    [allVersions, rule.id]
  );
  const [expanded, setExpanded] = useState<number | null>(versions[0]?.version ?? null);
  const [restoreTarget, setRestoreTarget] = useState<RuleVersion | null>(null);

  if (versions.length === 0) return null;

  const handleRestore = () => {
    if (!restoreTarget) return;
    const result = restoreRuleVersion(rule.id, restoreTarget.version);
    if (result.ok) {
      toast.success(`Restored v${restoreTarget.version}'s content`, { description: `${rule.name} is now a new version.` });
    } else {
      toast.error("Restore failed", { description: result.reason });
    }
    setRestoreTarget(null);
  };

  return (
    <>
      <Separator />
      <div className="py-4">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <History className="size-3.5" /> Version History
        </p>
        <div className="space-y-2">
          {versions.map((v, i) => {
            const prev = versions[i + 1];
            const diff = diffVersions(prev, v, catalog);
            const isOpen = expanded === v.version;
            const isCurrent = i === 0;
            const hasChanges =
              diff.metaChanges.length +
                diff.conditionsAdded.length +
                diff.conditionsRemoved.length +
                diff.actionsAdded.length +
                diff.actionsRemoved.length >
              0;
            return (
              <div key={v.version} className="rounded-lg border">
                <button
                  onClick={() => setExpanded(isOpen ? null : v.version)}
                  className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-sm"
                >
                  <span className="font-mono font-semibold">v{v.version}</span>
                  <span className="text-muted-foreground">
                    {v.changeType === "created"
                      ? "created"
                      : v.changeType === "restored"
                        ? `restored from v${v.restoredFromVersion}`
                        : "edited"}
                  </span>
                  <span className="text-muted-foreground">· {v.snapshotBy}</span>
                  <span className="ml-auto shrink-0 text-muted-foreground">
                    {formatDistanceToNow(new Date(v.snapshotAt), { addSuffix: true })}
                  </span>
                  <ChevronDown className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && (
                  <div className="space-y-1.5 border-t px-2.5 py-2.5 text-sm">
                    {!prev && <p className="text-muted-foreground">Initial version — nothing to compare against.</p>}
                    {prev && !hasChanges && <p className="text-muted-foreground">No content changes from v{prev.version}.</p>}
                    {diff.metaChanges.map((m) => (
                      <p key={m.label}>
                        <span className="font-medium">{m.label}:</span>{" "}
                        <span className="text-red-500 line-through">{String(m.before ?? "—")}</span> →{" "}
                        <span className="text-emerald-600 dark:text-emerald-400">{String(m.after ?? "—")}</span>
                      </p>
                    ))}
                    {diff.conditionsRemoved.map((c) => (
                      <p key={`c-${c}`} className="text-red-500">− {c}</p>
                    ))}
                    {diff.conditionsAdded.map((c) => (
                      <p key={`c+${c}`} className="text-emerald-600 dark:text-emerald-400">+ {c}</p>
                    ))}
                    {diff.actionsRemoved.map((a) => (
                      <p key={`a-${a}`} className="text-red-500">− {a}</p>
                    ))}
                    {diff.actionsAdded.map((a) => (
                      <p key={`a+${a}`} className="text-emerald-600 dark:text-emerald-400">+ {a}</p>
                    ))}
                    {!isCurrent && (
                      <Button variant="outline" size="sm" className="mt-1.5 gap-1.5" onClick={() => setRestoreTarget(v)}>
                        <RotateCcw className="size-3.5" /> Restore this version
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <AlertDialog open={!!restoreTarget} onOpenChange={(v) => !v && setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore v{restoreTarget?.version}?</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces the rule&apos;s current conditions, actions, and metadata with v{restoreTarget?.version}&apos;s
              content, saved as a new version (v{rule.version + 1}). Nothing is deleted — the current content stays in
              history too.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore}>Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function RuleViewSheet({ rule, open, onOpenChange }: { rule: BusinessRule | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const fieldCatalog = useAppStore((s) => s.fieldCatalog);
  const products = useAppStore((s) => s.products);
  const productRuleMappings = useAppStore((s) => s.productRuleMappings);
  const approvalRequests = useAppStore((s) => s.approvalRequests);
  const auditLog = useAppStore((s) => s.auditLog);
  const submission = useMemo(() => {
    if (!rule) return undefined;
    return approvalRequests
      .filter((a) => a.ruleId === rule.id)
      .sort((a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime())[0];
  }, [approvalRequests, rule]);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col gap-0 w-full sm:max-w-lg">
        {rule && (
          <>
            <SheetHeader className="shrink-0">
              <SheetTitle className="flex items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground">{rule.id}</span>
                {rule.name}
              </SheetTitle>
              <SheetDescription>{rule.description || "No description provided."}</SheetDescription>
            </SheetHeader>
            <ScrollArea className="flex-1 min-h-0 px-4">
              <div className="flex flex-wrap gap-2 pb-4">
                <StatusBadge status={rule.status} />
                <PriorityBadge priority={rule.priority} />
                <span className="rounded-full border px-2 py-0.5 text-sm">{rule.domain}</span>
                <span className="rounded-full border px-2 py-0.5 text-sm">{rule.category}</span>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3 py-4 text-sm">
                {/* FUTURE: Owner metadata removed for demo. Restore when reintroduced:
                <div>
                  <p className="text-muted-foreground">Owner</p>
                  <p className="font-medium">{rule.owner}</p>
                </div>
                */}
                <div>
                  <p className="text-muted-foreground">Version</p>
                  <p className="font-medium">v{rule.version}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{new Date(rule.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Updated</p>
                  <p className="font-medium">{new Date(rule.updatedAt).toLocaleDateString()}</p>
                </div>
                {submission && (
                  <>
                    <div>
                      <p className="text-muted-foreground">Submitted By</p>
                      <p className="font-medium">{submission.requestedBy}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Submission Date</p>
                      <p className="font-medium">{new Date(submission.requestedAt).toLocaleString()}</p>
                    </div>
                  </>
                )}
              </div>
              <ProductMappingSection rule={rule} products={products} mappings={productRuleMappings} />
              <Separator />
              <div className="py-4">
                <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">IF Conditions</p>
                <GroupView group={rule.rootGroup} catalog={fieldCatalog} />
              </div>
              <Separator />
              <div className="py-4">
                <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">THEN Actions</p>
                <ActionRowList actions={rule.actions} />
              </div>
              {rule.elseActions && rule.elseActions.length > 0 && (
                <>
                  <Separator />
                  <div className="py-4">
                    <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">ELSE Actions</p>
                    <ActionRowList actions={rule.elseActions} />
                  </div>
                </>
              )}
              <GeneratedVariablesSection rule={rule} />
              <ApprovalTimelineSection rule={rule} approvalRequests={approvalRequests} />
              <AuditTimelineSection rule={rule} auditLog={auditLog} />
              <VersionHistorySection key={rule.id} rule={rule} catalog={fieldCatalog} />
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
