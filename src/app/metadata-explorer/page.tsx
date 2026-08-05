"use client";

import { useRouter } from "next/navigation";
import { Compass, Building2, Tag, Database, Layers, LayoutTemplate, ShieldCheck, ArrowRight } from "lucide-react";
import { useAppStore, effectiveCapabilities } from "@/lib/store";
import { iconForIndustry } from "@/lib/industries";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

function SectionCard({
  icon: Icon,
  title,
  count,
  manageHref,
  manageParams,
  children,
}: {
  icon: React.ElementType;
  title: string;
  count: number;
  manageHref: string;
  manageParams?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="flex flex-col rounded-xl border bg-card shadow-sm">
      <div className="flex items-center gap-2.5 border-b px-4 py-3">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{count} configured</p>
        </div>
        <button
          onClick={() => router.push(manageHref + (manageParams ? `?${manageParams}` : ""))}
          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Manage <ArrowRight className="size-3" />
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto p-3">{children}</div>
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">{label}</p>;
}

export default function MetadataExplorerPage() {
  const industries = useAppStore((s) => s.industries);
  const ruleCategories = useAppStore((s) => s.ruleCategories);
  const fieldCatalog = useAppStore((s) => s.fieldCatalog);
  const ruleGroups = useAppStore((s) => s.ruleGroups);
  const ruleTemplates = useAppStore((s) => s.ruleTemplates);
  const users = useAppStore((s) => s.users);
  const userAccessMappings = useAppStore((s) => s.userAccessMappings);
  const rules = useAppStore((s) => s.rules);
  const matrices = useAppStore((s) => s.matrices);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b bg-card/40 px-5 py-3.5 sm:px-6">
        <span className="flex size-9 items-center justify-center rounded-xl border bg-muted/40">
          <Compass className="size-4.5 text-muted-foreground" />
        </span>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Metadata Explorer</h1>
          <p className="text-sm text-muted-foreground">
            Every configurable entity driving this platform, in one place — the proof surface that a new industry needs
            configuration only, never code.
          </p>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto grid max-w-350 grid-cols-1 gap-5 px-5 py-5 sm:px-6 lg:grid-cols-2 xl:grid-cols-3">
          <SectionCard icon={Building2} title="Industries" count={industries.length} manageHref="/configuration-studio">
            <div className="space-y-1.5">
              {industries.map((ind) => {
                const Icon = iconForIndustry(ind.icon);
                const ruleCount = rules.filter((r) => r.domain === ind.id).length;
                const fieldCount = fieldCatalog.filter((f) => f.domain === ind.id).length;
                const matrixCount = matrices.filter((m) => m.domain === ind.id).length;
                return (
                  <div key={ind.id} className="flex items-center gap-2.5 rounded-lg border px-2.5 py-2">
                    <Icon className="size-3.5 shrink-0 text-primary" />
                    <span className="flex-1 truncate text-sm font-medium">{ind.name}</span>
                    <span className="text-sm text-muted-foreground">{ruleCount} rules · {fieldCount} fields · {matrixCount} matrices</span>
                  </div>
                );
              })}
              {industries.length === 0 && <EmptyRow label="No industries configured yet." />}
            </div>
          </SectionCard>

          <SectionCard icon={Tag} title="Categories" count={ruleCategories.length} manageHref="/configuration-studio">
            <div className="flex flex-wrap gap-1.5">
              {ruleCategories.map((c) => (
                <Badge key={c.id} variant="secondary" className="text-sm">
                  {c.name} · {rules.filter((r) => r.category === c.name).length}
                </Badge>
              ))}
              {ruleCategories.length === 0 && <EmptyRow label="No categories configured yet." />}
            </div>
          </SectionCard>

          <SectionCard icon={Database} title="Field Catalog" count={fieldCatalog.length} manageHref="/configuration-studio">
            <div className="space-y-1.5">
              {fieldCatalog.map((f) => (
                <div key={f.key} className="flex items-center gap-2.5 rounded-lg border px-2.5 py-2">
                  <span className="flex-1 truncate text-sm font-medium">{f.label}</span>
                  <span className="font-mono text-sm text-muted-foreground">{f.type}</span>
                </div>
              ))}
              {fieldCatalog.length === 0 && <EmptyRow label="No fields configured yet." />}
            </div>
          </SectionCard>

          <SectionCard icon={Layers} title="Rule Groups" count={ruleGroups.length} manageHref="/repository">
            <div className="space-y-1.5">
              {ruleGroups.map((g) => (
                <div key={g.id} className="rounded-lg border px-2.5 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{g.name}</span>
                    <span className="text-sm text-muted-foreground">{rules.filter((r) => r.groupId === g.id).length} rules</span>
                  </div>
                  {g.description && <p className="mt-0.5 text-sm text-muted-foreground">{g.description}</p>}
                </div>
              ))}
              {ruleGroups.length === 0 && <EmptyRow label="No rule groups configured yet." />}
            </div>
          </SectionCard>

          <SectionCard icon={LayoutTemplate} title="Rule Templates" count={ruleTemplates.length} manageHref="/rule-builder">
            <div className="space-y-1.5">
              {ruleTemplates.map((t) => (
                <div key={t.id} className="rounded-lg border px-2.5 py-2">
                  <span className="text-sm font-medium">{t.name}</span>
                  <p className="mt-0.5 text-sm text-muted-foreground">{t.description}</p>
                </div>
              ))}
              {ruleTemplates.length === 0 && <EmptyRow label="No rule templates configured yet." />}
            </div>
          </SectionCard>

          <SectionCard icon={ShieldCheck} title="Users & Access" count={users.length} manageHref="/configuration-studio">
            <div className="space-y-1.5">
              {users.map((u) => {
                const caps = [...effectiveCapabilities(users, userAccessMappings, u.id)];
                return (
                  <div key={u.id} className="rounded-lg border px-2.5 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium">{u.name}</span>
                      <span className="text-sm text-muted-foreground">· {u.role}</span>
                      {u.adminScope && (
                        <Badge variant="outline" className="text-sm">
                          {u.adminScope === "system" ? "System Admin" : "Product Admin"}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {caps.map((c) => (
                        <Badge key={c} variant="outline" className="text-sm">{c}</Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
              {users.length === 0 && <EmptyRow label="No users configured yet." />}
            </div>
          </SectionCard>
        </div>
      </ScrollArea>
    </div>
  );
}
