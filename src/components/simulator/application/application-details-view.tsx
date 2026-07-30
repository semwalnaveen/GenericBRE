"use client";

import { Package, User, CalendarClock, CheckCircle2, XCircle } from "lucide-react";
import { BusinessField, LoanApplication, Product } from "@/lib/types";
import { groupApplicationFields, ApplicationFieldRow } from "@/lib/applications";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function formatValue(row: ApplicationFieldRow): React.ReactNode {
  if (typeof row.value === "boolean") {
    return row.value ? (
      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="size-3.5" /> Yes</span>
    ) : (
      <span className="inline-flex items-center gap-1 text-muted-foreground"><XCircle className="size-3.5" /> No</span>
    );
  }
  if (typeof row.value === "number") {
    const isCurrency = row.unit === "₹";
    const formatted = row.value.toLocaleString("en-IN");
    if (isCurrency) return `₹${formatted}`;
    return row.unit ? `${formatted}${row.unit === "%" ? "" : " "}${row.unit}` : formatted;
  }
  return String(row.value);
}

// Read-only, catalog-grouped applicant form for the Application-ID simulator
// (spec step 5). No editing — all data comes from the fetched application.
export function ApplicationDetailsView({
  application,
  product,
  fieldCatalog,
}: {
  application: LoanApplication;
  product: Product;
  fieldCatalog: BusinessField[];
}) {
  const sections = groupApplicationFields(application, fieldCatalog);

  return (
    <div className="space-y-3">
      {/* Identity header — auto-identified product + applicant */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Package className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-bold text-foreground">{product.name}</p>
              <Badge variant="outline" className="h-5 shrink-0 font-mono text-[11px]">{application.id}</Badge>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><User className="size-3.5" /> {application.applicantName}</span>
              <span className="flex items-center gap-1"><CalendarClock className="size-3.5" /> {new Date(application.submittedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <Badge variant="secondary" className="shrink-0 text-sm">{application.status}</Badge>
      </div>

      {/* Grouped read-only fields */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {sections.map((section) => (
          <div key={section.entity} className="rounded-xl border bg-card p-4 shadow-xs">
            <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">{section.title}</p>
            <dl className="space-y-2">
              {section.rows.map((row) => (
                <div key={row.key} className="flex items-center justify-between gap-3 border-b border-border/40 pb-2 last:border-0 last:pb-0">
                  <dt className="text-sm text-muted-foreground">{row.label}</dt>
                  <dd className="text-sm font-semibold text-foreground text-right tabular-nums">{formatValue(row)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

// Loading skeleton shown while the application is being fetched (spec step 12).
export function ApplicationDetailsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-xs">
        <Skeleton className="size-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-2.5 rounded-xl border bg-card p-4 shadow-xs">
            <Skeleton className="h-3 w-28" />
            {[0, 1, 2].map((j) => (
              <div key={j} className="flex justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
