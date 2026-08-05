"use client";

import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { ChevronDown, History, RotateCcw, Boxes, Variable, MessageSquare, CheckCheck, Clock, ScrollText, ListTree } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
      {actions.map((a) => {
        const outKey = a.outputTarget === "RUNTIME_VARIABLE" ? a.outputVariable : a.outputField;
        return (
          <div key={a.id} className="rounded-md border bg-muted/30 px-2.5 py-1.5 text-sm">
            <span className="font-medium">{a.type}</span>
            {a.message && <span className="text-muted-foreground"> — {a.message}</span>}
            {outKey && (
              <span className="text-muted-foreground">
                {" "}
                — set <span className="font-mono">{outKey}</span> = <span className="font-mono bg-muted/50 px-1 py-0.5 rounded">{a.outputValue}</span>
              </span>
            )}
          </div>
        );
      })}
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
  const allRules = useAppStore((s) => s.rules);
  const rows = useMemo(
    () =>
      mappings
        .filter((m) => m.ruleId === rule.id)
        .map((m) => ({ mapping: m, product: products.find((p) => p.id === m.productId) }))
        .sort((a, b) => (a.mapping.order ?? 999) - (b.mapping.order ?? 999)),
    [mappings, products, rule.id]
  );

  return (
    <Card className="rounded-xl border-[#D0E4F5] p-4 shadow-sm sm:p-5">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Boxes className="size-3.5" /> Product Mapping & Sequence
      </p>
      {rows.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">Not yet mapped to any product.</p>
      ) : (
        <div className="space-y-2">
          {rows.map(({ mapping, product }) => {
            const productMappings = mappings
              .filter((m) => m.productId === mapping.productId)
              .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

            return (
              <div key={mapping.id} className="rounded-md border bg-muted/30 px-2.5 py-1.5 text-sm flex flex-col gap-2">
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
                  <Dialog>
                    <DialogTrigger className="text-sm font-medium text-primary hover:underline ml-auto focus:outline-none">
                      Show Sequence
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Rule Sequence for {product?.name ?? mapping.productId}</DialogTitle>
                      </DialogHeader>
                      <div className="max-h-[60vh] overflow-y-auto space-y-1.5 pt-4">
                        {productMappings.map((m) => {
                          const r = allRules.find((r) => r.id === m.ruleId);
                          const isCurrent = r?.id === rule.id;
                          return (
                            <div key={m.id} className={`flex items-center justify-between rounded-md px-3 py-2 text-sm border ${isCurrent ? 'bg-primary/10 border-primary shadow-sm' : 'bg-muted/30 border-border'}`}>
                              <div className="flex items-center gap-2">
                                <span className={`font-mono text-xs w-6 h-6 flex items-center justify-center rounded-full ${isCurrent ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20 text-muted-foreground'}`}>{m.order ?? '-'}</span>
                                <span className={`font-medium ${isCurrent ? 'text-primary' : ''}`}>{r?.name ?? m.ruleId}</span>
                              </div>
                              {isCurrent && <Badge variant="default" className="text-[10px] px-1.5 py-0">Current</Badge>}
                            </div>
                          );
                        })}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                {mapping.remarks && (
                  <p className="flex items-start gap-1.5 text-muted-foreground">
                    <MessageSquare className="mt-0.5 size-3.5 shrink-0" />
                    <span className="whitespace-pre-wrap">{mapping.remarks}</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function RulePreviewSection({ rule, catalog }: { rule: BusinessRule; catalog: BusinessField[] }) {
  const flatConds = useMemo(() => flattenConditions(rule.rootGroup), [rule.rootGroup]);
  const inputFields = useMemo(() => {
    const fields = new Set(flatConds.map((c) => c.field));
    return Array.from(fields).map((f) => getField(catalog, f)?.label ?? f);
  }, [flatConds, catalog]);
  
  const generatedVars = useMemo(() => ownGeneratedVariables(rule), [rule]);

  return (
    <Card className="rounded-xl border-[#D0E4F5] p-4 shadow-sm sm:p-5">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <ListTree className="size-3.5" /> Rule Preview
      </p>
      
      <div className="space-y-4 text-sm">
        {inputFields.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">Input Fields</p>
            <div className="flex flex-wrap gap-1.5">
              {inputFields.map((f) => (
                <Badge key={f} variant="outline" className="font-normal bg-background">
                  {f}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">Conditions</p>
          <div className="space-y-1">
            {flatConds.length === 0 ? (
              <p className="text-muted-foreground">No conditions.</p>
            ) : (
              flatConds.map((c, i) => (
                <p key={i}>
                  {i === 0 ? "IF " : "AND "}
                  {describeCondition(c, catalog)}
                </p>
              ))
            )}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">Actions</p>
          <div className="space-y-1">
            {rule.actions.map((a, i) => (
              <p key={i}>THEN {describeAction(a)}</p>
            ))}
            {rule.elseActions?.map((a, i) => (
              <p key={`else-${i}`}>ELSE {describeAction(a)}</p>
            ))}
          </div>
        </div>

        {generatedVars.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">Generated Variables</p>
            <div className="flex flex-wrap gap-1.5">
              {generatedVars.map((v) => (
                <Badge key={v.key} variant="secondary" className="font-normal bg-muted/50">
                  <Variable className="mr-1 size-3" /> {v.key}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function GeneratedVariablesSection({ rule }: { rule: BusinessRule }) {
  const vars = useMemo(() => ownGeneratedVariables(rule), [rule]);
  if (vars.length === 0) return null;
  return (
    <Card className="rounded-xl border-[#D0E4F5] p-4 shadow-sm sm:p-5">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
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
    </Card>
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
    <AccordionItem value="approval-timeline" className="rounded-xl border border-[#D0E4F5] bg-card p-4 shadow-sm sm:p-5">
      <AccordionTrigger className="py-0 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline">
        <span className="flex items-center gap-1.5">
          <CheckCheck className="size-3.5" /> Approval Timeline
        </span>
      </AccordionTrigger>
      <AccordionContent className="pt-3 pb-0">
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
    <AccordionItem value="audit-timeline" className="rounded-xl border border-[#D0E4F5] bg-card p-4 shadow-sm sm:p-5">
      <AccordionTrigger className="py-0 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline">
        <span className="flex items-center gap-1.5">
          <ScrollText className="size-3.5" /> Audit Timeline ({entries.length})
        </span>
      </AccordionTrigger>
      <AccordionContent className="pt-3 pb-0">
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
  );
}

function VersionHistorySection({ rule, catalog }: { rule: BusinessRule; catalog: BusinessField[] }) {
  const allVersions = useAppStore((s) => s.ruleVersions);
  const restoreRuleVersion = useAppStore((s) => s.restoreRuleVersion);
  const versions = useMemo(
    () => allVersions.filter((v) => v.ruleId === rule.id).sort((a, b) => b.version - a.version),
    [allVersions, rule.id]
  );
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
      <AccordionItem value="version-history" className="rounded-xl border border-[#D0E4F5] bg-card p-4 shadow-sm sm:p-5">
        <AccordionTrigger className="py-0 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline">
          <span className="flex items-center gap-1.5">
            <History className="size-3.5" /> Version History
          </span>
        </AccordionTrigger>
        <AccordionContent className="pt-3 pb-0">
          <Accordion defaultValue={[String(versions[0]?.version)]} className="space-y-2">
            {versions.map((v, i) => {
              const prev = versions[i + 1];
              const diff = diffVersions(prev, v, catalog);
              const isCurrent = i === 0;
              const hasChanges =
                diff.metaChanges.length +
                  diff.conditionsAdded.length +
                  diff.conditionsRemoved.length +
                  diff.actionsAdded.length +
                  diff.actionsRemoved.length >
                0;
              return (
                <AccordionItem key={v.version} value={String(v.version)} className="rounded-lg border px-0">
                  <AccordionTrigger className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-sm hover:no-underline hover:bg-muted/30 transition-colors [&[data-state=open]>svg]:rotate-180">
                    <span className="font-mono font-semibold flex-shrink-0">v{v.version}</span>
                    <span className="text-muted-foreground flex-shrink-0">
                      {v.changeType === "created"
                        ? "created"
                        : v.changeType === "restored"
                          ? `restored from v${v.restoredFromVersion}`
                          : "edited"}
                    </span>
                    <span className="text-muted-foreground flex-shrink-0">· {v.snapshotBy}</span>
                    <span className="ml-auto shrink-0 text-muted-foreground">
                      {formatDistanceToNow(new Date(v.snapshotAt), { addSuffix: true })}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-1.5 border-t px-2.5 py-2.5 text-sm">
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
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </AccordionContent>
      </AccordionItem>

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

// Full-content, read-only rule detail — rendered by /repository/view (a routed
// page, not a modal) so there's enough width for Product Mapping/Conditions/
// Actions/Timelines to actually be readable, instead of squeezed into a side
// sheet. The caller owns the page chrome (header/back button/bottom action bar).
export function RuleDetailView({ rule }: { rule: BusinessRule }) {
  const fieldCatalog = useAppStore((s) => s.fieldCatalog);
  const products = useAppStore((s) => s.products);
  const productRuleMappings = useAppStore((s) => s.productRuleMappings);
  const approvalRequests = useAppStore((s) => s.approvalRequests);
  const auditLog = useAppStore((s) => s.auditLog);
  const submission = useMemo(() => {
    return approvalRequests
      .filter((a) => a.ruleId === rule.id)
      .sort((a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime())[0];
  }, [approvalRequests, rule.id]);

  const activeMappings = useMemo(
    () =>
      productRuleMappings
        .filter((m) => m.ruleId === rule.id)
        .map((m) => ({ mapping: m, product: products.find((p) => p.id === m.productId) }))
        .sort((a, b) => (a.mapping.order ?? 999) - (b.mapping.order ?? 999)),
    [productRuleMappings, products, rule.id]
  );

  return (
    <div className="space-y-4 xl:space-y-6">
      {/* Top Header Badges for Sequence */}
      {activeMappings.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeMappings.map(({ mapping, product }) => (
            <div
              key={mapping.id}
              className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary shadow-sm"
            >
              <Boxes className="size-4" />
              <span>{product?.name ?? "Unknown Product"}</span>
              <span className="text-primary/60">•</span>
              <span>Sequence #{mapping.order ?? "?"}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3 xl:gap-6">
        {/* Left Column (Context & Meta - 1 Column) */}
        <div className="flex flex-col gap-4 lg:col-span-1">
          <Card className="rounded-xl border-[#D0E4F5] p-4 shadow-sm sm:p-5">
            <p className="text-sm text-muted-foreground">{rule.description || "No description provided."}</p>
            <div className="flex flex-wrap gap-2 py-4">
              <StatusBadge status={rule.status} />
              <PriorityBadge priority={rule.priority} />
              <span className="rounded-full border px-2 py-0.5 text-sm">{rule.domain}</span>
              <span className="rounded-full border px-2 py-0.5 text-sm">{rule.category}</span>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-y-4 gap-x-2 pt-4 text-sm">
              {submission && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Submission Date</p>
                  <p className="font-medium">{new Date(submission.requestedAt).toLocaleString()}</p>
                </div>
              )}
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
                <div>
                  <p className="text-muted-foreground">Submitted By</p>
                  <p className="font-medium">{submission.requestedBy}</p>
                </div>
              )}
            </div>
          </Card>

          <ProductMappingSection rule={rule} products={products} mappings={productRuleMappings} />
          <RulePreviewSection rule={rule} catalog={fieldCatalog} />
        </div>

        {/* Right Column (Core Logic & Timelines - 2 Columns) */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card className="rounded-xl border-[#D0E4F5] p-4 shadow-sm sm:p-5">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">IF Conditions</p>
              <div className="rounded-lg bg-card sm:p-2">
                <GroupView group={rule.rootGroup} catalog={fieldCatalog} />
              </div>
            </div>
            <Separator className="my-4" />
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">THEN Actions</p>
              <div className="rounded-lg bg-card sm:p-2">
                <ActionRowList actions={rule.actions} />
              </div>
            </div>
            {rule.elseActions && rule.elseActions.length > 0 && (
              <>
                <Separator className="my-4" />
                <div>
                  <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">ELSE Actions</p>
                  <div className="rounded-lg bg-card sm:p-2">
                    <ActionRowList actions={rule.elseActions} />
                  </div>
                </div>
              </>
            )}
          </Card>

          <GeneratedVariablesSection rule={rule} />
          
          <Accordion defaultValue={["version-history"]} className="mt-4 flex flex-col gap-4">
            <ApprovalTimelineSection rule={rule} approvalRequests={approvalRequests} />
            <AuditTimelineSection rule={rule} auditLog={auditLog} />
            <VersionHistorySection key={rule.id} rule={rule} catalog={fieldCatalog} />
          </Accordion>
        </div>
      </div>
    </div>
  );
}
