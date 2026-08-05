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
    <div className="group relative flex flex-col rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.1)] overflow-hidden">
      {/* Subtle mesh/radial gradient background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative z-10 flex items-center gap-3 border-b border-border/50 px-4 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary ring-1 ring-primary/20 shadow-[0_0_15px_-3px_rgba(var(--primary),0.2)] transition-transform duration-300 group-hover:scale-110">
          <Icon className="size-4" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">{title}</p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{count} configured</p>
        </div>
        <button
          onClick={() => router.push(manageHref + (manageParams ? `?${manageParams}` : ""))}
          className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-primary opacity-80 hover:opacity-100 transition-all hover:translate-x-0.5 duration-300"
        >
          Manage <ArrowRight className="size-3" />
        </button>
      </div>
      <div className="relative z-10 max-h-36 overflow-y-auto p-2.5 space-y-1.5">{children}</div>
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return <p className="rounded-xl border border-dashed px-3 py-6 text-center text-sm font-medium text-muted-foreground bg-background/50">{label}</p>;
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
        <div className="mx-auto grid max-w-350 grid-cols-1 gap-4 px-4 py-4 sm:px-6 lg:grid-cols-2 xl:grid-cols-3">
          <SectionCard icon={Building2} title="Industries" count={industries.length} manageHref="/configuration-studio" manageParams="tab=industries">
            <div className="space-y-1.5">
              {industries.map((ind) => {
                const Icon = iconForIndustry(ind.icon);
                const ruleCount = rules.filter((r) => r.domain === ind.id).length;
                const fieldCount = fieldCatalog.filter((f) => f.domain === ind.id).length;
                const matrixCount = matrices.filter((m) => m.domain === ind.id).length;
                return (
                  <div key={ind.id} className="group/item flex items-center gap-2 rounded-lg border border-border/50 bg-background/50 px-2 py-1.5 transition-colors hover:bg-muted/50">
                    <Icon className="size-3.5 shrink-0 text-primary transition-transform group-hover/item:scale-110" />
                    <span className="flex-1 truncate text-xs font-semibold text-foreground">{ind.name}</span>
                    <span className="text-[10px] font-medium text-muted-foreground">{ruleCount} rules · {fieldCount} fields · {matrixCount} matrices</span>
                  </div>
                );
              })}
              {industries.length === 0 && <EmptyRow label="No industries configured yet." />}
            </div>
          </SectionCard>

          <SectionCard icon={Tag} title="Categories" count={ruleCategories.length} manageHref="/configuration-studio" manageParams="tab=categories">
            <div className="flex flex-wrap gap-1.5">
              {ruleCategories.map((c) => (
                <Badge key={c.id} variant="secondary" className="px-2 py-0.5 text-[10px] font-semibold shadow-xs">
                  {c.name} <span className="ml-1 text-muted-foreground">{rules.filter((r) => r.category === c.name).length}</span>
                </Badge>
              ))}
              {ruleCategories.length === 0 && <EmptyRow label="No categories configured yet." />}
            </div>
          </SectionCard>

          <SectionCard icon={Database} title="Field Catalog" count={fieldCatalog.length} manageHref="/configuration-studio">
            <div className="space-y-1.5">
              {fieldCatalog.map((f) => (
                <div key={f.key} className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-background/50 px-2 py-1.5 transition-colors hover:bg-muted/50">
                  <span className="flex-1 truncate text-xs font-semibold">{f.label}</span>
                  <span className="rounded bg-primary/10 px-1 py-0.5 font-mono text-[9px] font-bold text-primary">{f.type}</span>
                </div>
              ))}
              {fieldCatalog.length === 0 && <EmptyRow label="No fields configured yet." />}
            </div>
          </SectionCard>

          <SectionCard icon={Layers} title="Rule Groups" count={ruleGroups.length} manageHref="/repository">
            <div className="space-y-1.5">
              {ruleGroups.map((g) => (
                <div key={g.id} className="rounded-lg border border-border/50 bg-background/50 px-2 py-1.5 transition-colors hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{g.name}</span>
                    <span className="text-[10px] font-medium text-muted-foreground">{rules.filter((r) => r.groupId === g.id).length} rules</span>
                  </div>
                  {g.description && <p className="mt-0.5 text-[10px] text-muted-foreground/80">{g.description}</p>}
                </div>
              ))}
              {ruleGroups.length === 0 && <EmptyRow label="No rule groups configured yet." />}
            </div>
          </SectionCard>

          <SectionCard icon={LayoutTemplate} title="Rule Templates" count={ruleTemplates.length} manageHref="/configuration-studio" manageParams="tab=rule-templates">
            <div className="space-y-1.5">
              {ruleTemplates.map((t) => (
                <div key={t.id} className="rounded-lg border border-border/50 bg-background/50 px-2 py-1.5 transition-colors hover:bg-muted/50">
                  <span className="text-xs font-semibold">{t.name}</span>
                  <p className="mt-0.5 text-[10px] text-muted-foreground/80">{t.description}</p>
                </div>
              ))}
              {ruleTemplates.length === 0 && <EmptyRow label="No rule templates configured yet." />}
            </div>
          </SectionCard>

          <SectionCard icon={ShieldCheck} title="Users & Access" count={users.length} manageHref="/configuration-studio" manageParams="tab=users">
            <div className="space-y-1.5">
              {users.map((u) => {
                const caps = [...effectiveCapabilities(users, userAccessMappings, u.id)];
                return (
                  <div key={u.id} className="rounded-lg border border-border/50 bg-background/50 px-2 py-1.5 transition-colors hover:bg-muted/50">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold">{u.name}</span>
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">· {u.role}</span>
                      {u.adminScope && (
                        <Badge variant="outline" className="text-[9px] font-semibold bg-primary/5 text-primary border-primary/20 px-1 py-0 h-4">
                          {u.adminScope === "system" ? "System Admin" : "Product Admin"}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {caps.map((c) => (
                        <Badge key={c} variant="secondary" className="text-[9px] bg-accent text-muted-foreground hover:bg-accent/80 hover:text-foreground transition-colors px-1 py-0 h-4">{c}</Badge>
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
