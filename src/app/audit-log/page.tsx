"use client";

import { Fragment, useMemo, useState, useEffect } from "react";
import { format } from "date-fns";
import { Download, Search, ScrollText, ShieldCheck, ShieldAlert, ShieldQuestion, ChevronRight, ChevronLeft } from "lucide-react";
import { useAppStore, useUserScope, isRuleInScope } from "@/lib/store";
import { AuditEntry, BusinessRule, Product, SimulationResult } from "@/lib/types";
import { verifyAuditChain, AuditIntegrityResult } from "@/lib/audit-chain";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";
import { RouteGuard } from "@/components/shell/route-guard";

// Best-effort domain resolution — AuditEntry itself carries no `domain` field
// (most actions, e.g. role/category edits, have no domain at all), so this
// cross-references the entity types that genuinely do: a rule/product's own
// domain, or a simulation's domain (SimulationResult already carries one
// directly). Anything else (Role, RuleCategory, RuleTemplate, ...) has no
// resolvable domain and is simply excluded when a Domain filter is active.
function resolveDomain(
  entry: AuditEntry,
  rules: BusinessRule[],
  products: Product[],
  simulations: SimulationResult[]
): string | undefined {
  if (entry.entity === "BusinessRule") return rules.find((r) => r.id === entry.entityId)?.domain;
  if (entry.entity === "Product") return products.find((p) => p.id === entry.entityId)?.domain;
  if (entry.entity === "Simulation") return simulations.find((s) => s.id === entry.entityId)?.domain;
  if (entry.entity === "Industry") return entry.entityId;
  return undefined;
}

export default function AuditLogPage() {
  const auditLog = useAppStore((s) => s.auditLog);
  const rules = useAppStore((s) => s.rules);
  const products = useAppStore((s) => s.products);
  const simulations = useAppStore((s) => s.simulations);
  const industries = useAppStore((s) => s.industries);
  const productRuleMappings = useAppStore((s) => s.productRuleMappings);
  const currentUserName = useAppStore((s) => s.currentUser.name);
  const userScope = useUserScope();
  const ruleById = useMemo(() => new Map(rules.map((r) => [r.id, r])), [rules]);
  const [search, setSearch] = useState("");
  const [actions, setActions] = useState<string[]>([]);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [users, setUsers] = useState<string[]>([]);
  const [integrity, setIntegrity] = useState<AuditIntegrityResult | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const runVerify = () => setIntegrity(verifyAuditChain(auditLog));

  const domainByEntry = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of auditLog) {
      const d = resolveDomain(a, rules, products, simulations);
      if (d) map.set(a.id, d);
    }
    return map;
  }, [auditLog, rules, products, simulations]);

  const actionOptions = useMemo(
    () => Array.from(new Set(auditLog.map((a) => a.action))).map((a) => ({ value: a, label: a })),
    [auditLog]
  );
  const entityTypeOptions = useMemo(
    () => Array.from(new Set(auditLog.map((a) => a.entity))).map((e) => ({ value: e, label: e })),
    [auditLog]
  );
  const domainOptions = useMemo(() => {
    const present = new Set(domainByEntry.values());
    return industries.filter((i) => present.has(i.id)).map((i) => ({ value: i.id, label: i.name }));
  }, [domainByEntry, industries]);
  const userOptions = useMemo(
    () => Array.from(new Set(auditLog.map((a) => a.user))).map((u) => ({ value: u, label: u })),
    [auditLog]
  );

  const filtered = auditLog.filter((a) => {
    // Never surface a BusinessRule entry for a rule this user isn't allowed
    // to open — same scoping as Dashboard/Repository/Search (see
    // isRuleInScope/useUserScope in store.ts). Verification (runVerify
    // above) still runs against the full, unfiltered auditLog — the hash
    // chain is sequential across every entry, so scoping the chain itself
    // would break integrity checking, not just visibility.
    if (a.entity === "BusinessRule") {
      const rule = ruleById.get(a.entityId);
      if (rule && !isRuleInScope(rule, userScope, productRuleMappings, currentUserName)) return false;
    }
    if (search && !`${a.user} ${a.entityId} ${a.details}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (actions.length && !actions.includes(a.action)) return false;
    if (entityTypes.length && !entityTypes.includes(a.entity)) return false;
    if (users.length && !users.includes(a.user)) return false;
    if (domains.length && !domains.includes(domainByEntry.get(a.id) ?? "")) return false;
    return true;
  });

  const hasFilters = !!(search || actions.length || entityTypes.length || domains.length || users.length);
  const clearAll = () => {
    setSearch("");
    setActions([]);
    setEntityTypes([]);
    setDomains([]);
    setUsers([]);
  };

  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, actions, entityTypes, domains, users, itemsPerPage]);

  const paginatedData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <RouteGuard requiredCapability="config.manage" moduleLabel="the Audit Log">
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b bg-card/40 px-5 py-3.5 sm:px-6">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <ScrollText className="size-4.5 text-muted-foreground" /> Audit Log
          </h1>
          <p className="text-sm text-muted-foreground">Tamper-evident, append-only trail of every significant platform action</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={runVerify}>
            <ShieldCheck className="size-3.5" /> Verify Integrity
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() =>
              downloadCsv(
                "audit_log",
                filtered.map((a) => ({
                  Timestamp: a.timestamp,
                  User: a.user,
                  Action: a.action,
                  Entity: a.entity,
                  EntityID: a.entityId,
                  Details: a.details,
                  CorrelationID: a.decisionContext?.correlationId ?? "",
                }))
              )
            }
          >
            <Download className="size-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {integrity && (
        <div
          className={cn(
            "flex shrink-0 items-start gap-2.5 border-b px-5 py-2.5 text-sm sm:px-6",
            integrity.intact ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-destructive/10 text-destructive"
          )}
        >
          {integrity.intact ? <ShieldCheck className="mt-0.5 size-3.5 shrink-0" /> : <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />}
          <div>
            {integrity.intact ? (
              <p>
                <span className="font-semibold">Chain intact</span> — all {integrity.checkedCount} entries verified against
                their recorded hash.
              </p>
            ) : (
              <p>
                <span className="font-semibold">Tampering detected</span> at entry {integrity.brokenAtId} — its content (or
                something before it) no longer matches the recorded hash chain.
              </p>
            )}
            <p className="mt-0.5 flex items-center gap-1 text-sm opacity-80">
              <ShieldQuestion className="size-3 shrink-0" /> This detects casual edits to this browser&apos;s stored log,
              not a determined attacker — there&apos;s no backend, so anyone with devtools access could recompute a
              consistent chain. Real immutability needs server-side signing.
            </p>
          </div>
        </div>
      )}

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-5 py-2.5 sm:px-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by user, entity, or details..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-72 pl-8" />
        </div>
        <MultiSelect label="Action Type" options={actionOptions} selected={actions} onChange={setActions} />
        <MultiSelect label="Entity Type" options={entityTypeOptions} selected={entityTypes} onChange={setEntityTypes} />
        <MultiSelect label="Domain" options={domainOptions} selected={domains} onChange={setDomains} />
        <MultiSelect label="User" options={userOptions} selected={users} onChange={setUsers} />
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-9 text-sm" onClick={clearAll}>
            Clear all
          </Button>
        )}
        <span className="ml-auto text-sm text-muted-foreground">{filtered.length} entries</span>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-5 py-4 sm:px-6">
          <div className="flex flex-col rounded-xl border bg-card shadow-sm">
            <div className="overflow-y-auto max-h-[600px]">
              <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50/80 dark:bg-muted/80 text-sm text-muted-foreground border-b backdrop-blur-sm">
                <tr>
                  <th className="w-7 px-2 py-2" />
                  <th className="px-3 py-2 text-left font-medium">Timestamp</th>
                  <th className="px-3 py-2 text-left font-medium">User</th>
                  <th className="px-3 py-2 text-left font-medium">Action</th>
                  <th className="px-3 py-2 text-left font-medium">Entity Type</th>
                  <th className="px-3 py-2 text-left font-medium">Entity ID</th>
                  <th className="px-3 py-2 text-left font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <ScrollText className="size-6 text-muted-foreground/40" />
                        <span>No audit entries match the current filters.</span>
                      </div>
                    </td>
                  </tr>
                )}
                {paginatedData.map((a) => {
                  const isOpen = expanded.has(a.id);
                  return (
                    <Fragment key={a.id}>
                      <tr
                        className={cn(
                          "hover:bg-accent/30",
                          (a.decisionContext || a.changes?.length) && "cursor-pointer",
                          integrity && !integrity.intact && a.id === integrity.brokenAtId && "bg-destructive/10"
                        )}
                        onClick={() => (a.decisionContext || a.changes?.length) && toggleExpanded(a.id)}
                      >
                        <td className="px-2 py-2">
                          {(a.decisionContext || a.changes?.length) && (
                            <ChevronRight className={cn("size-3.5 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-sm text-muted-foreground">{format(new Date(a.timestamp), "dd MMM yyyy, HH:mm")}</td>
                        <td className="px-3 py-2 text-sm font-medium">{a.user}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-sm font-medium text-primary">{a.action}</td>
                        <td className="px-3 py-2 text-sm text-muted-foreground">{a.entity}</td>
                        <td className="px-3 py-2 text-sm font-mono text-muted-foreground">{a.entityId}</td>
                        <td className="px-3 py-2 text-sm text-muted-foreground">{a.details}</td>
                      </tr>
                      {/* Access-control before/after values. Unlike the hashed
                          `details` summary these are display detail only (see
                          AuditEntry.changes in types.ts). */}
                      {isOpen && a.changes?.length ? (
                        <tr key={`${a.id}-changes`} className="bg-muted/20">
                          <td colSpan={7} className="px-5 py-3">
                            <p className="mb-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                              What changed
                            </p>
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-md text-sm">
                                <thead>
                                  <tr className="text-left text-muted-foreground">
                                    <th className="py-1 pr-4 font-medium">Field</th>
                                    <th className="py-1 pr-4 font-medium">Before</th>
                                    <th className="py-1 font-medium">After</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {a.changes.map((c, i) => (
                                    <tr key={`${c.field}-${i}`} className="border-t border-border/60">
                                      <td className="py-1.5 pr-4 font-medium">{c.field}</td>
                                      <td className="py-1.5 pr-4 text-muted-foreground line-through decoration-destructive/40">
                                        {c.oldValue}
                                      </td>
                                      <td className="py-1.5 font-medium text-emerald-600 dark:text-emerald-400">{c.newValue}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                      {isOpen && a.decisionContext && (
                        <tr key={`${a.id}-detail`} className="bg-muted/20">
                          <td colSpan={7} className="px-5 py-3">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                              <DetailField label="Correlation ID" value={a.decisionContext.correlationId} mono />
                              {/* Environment removed — FUTURE: restore <DetailField label="Environment" value={a.decisionContext.environment} /> */}
                              <DetailField label="Execution Time" value={`${a.decisionContext.executionTimeMs.toFixed(1)}ms`} />
                              <DetailField
                                label="Triggered Rules"
                                value={a.decisionContext.triggeredRules.length ? a.decisionContext.triggeredRules.join(", ") : "—"}
                              />
                            </div>
                            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                              <div>
                                <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Request Payload</p>
                                <pre className="max-h-48 overflow-auto rounded-lg bg-background p-2.5 text-sm leading-relaxed">
                                  {JSON.stringify(a.decisionContext.requestPayload, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Response Payload</p>
                                <pre className="max-h-48 overflow-auto rounded-lg bg-background p-2.5 text-sm leading-relaxed">
                                  {JSON.stringify(a.decisionContext.responsePayload, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t px-4 py-2 bg-slate-50/50 dark:bg-muted/10">
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-muted-foreground">Rows per page</span>
              <Select
                value={String(itemsPerPage)}
                onValueChange={(v) => setItemsPerPage(Number(v))}
              >
                <SelectTrigger size="sm" className="h-7 w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[6, 10, 20, 50].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="ml-2 text-[13px] text-muted-foreground whitespace-nowrap">
                Total {filtered.length} entr{filtered.length !== 1 ? "ies" : "y"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[13px] text-muted-foreground">
                Page {currentPage} of {Math.max(1, totalPages)}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
    </RouteGuard>
  );
}

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-sm uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("font-medium", mono && "font-mono")}>{value}</p>
    </div>
  );
}
