"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Copy, Eye, FileEdit, Archive, Ban, PlayCircle, FlaskConical, Undo2, CheckCheck, MoreHorizontal, TestTube2, Trash2, Rocket } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ApprovalRequest, BusinessRule, Product, ProductRuleMapping, RuleGroup } from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function SortHeader({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 hover:text-foreground transition-colors">
      {label}
      <ArrowUpDown className="size-3" />
    </button>
  );
}

export interface RepositoryActions {
  onView: (r: BusinessRule) => void;
  onEdit: (r: BusinessRule) => void;
  onClone: (r: BusinessRule) => void;
  onDisable: (r: BusinessRule) => void;
  onArchive: (r: BusinessRule) => void;
  onSubmitForReview: (r: BusinessRule) => void;
  onApprove: (r: BusinessRule) => void;
  onReject: (r: BusinessRule) => void;
  onPublish: (r: BusinessRule) => void;
  onReactivate: (r: BusinessRule) => void;
  onTestInSimulator: (r: BusinessRule) => void;
  onPromote: (r: BusinessRule) => void;
  onDelete: (r: BusinessRule) => void;
}

// FUTURE: NEXT_ENV removed for demo. Restore when environment promotion is reintroduced.
// const NEXT_ENV: Record<RuleEnvironment, RuleEnvironment | null> = { Dev: "UAT", UAT: "Prod", Prod: null };

export interface RepositoryColumnContext {
  canPublish: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  ruleGroups: RuleGroup[];
  products: Product[];
  productRuleMappings: ProductRuleMapping[];
  approvalRequests: ApprovalRequest[];
}

// Latest submission + approval records for a rule, powering the governance
// columns (Submitted By/Date, Approved By/Date).
function govFor(ruleId: string, approvalRequests: ApprovalRequest[]) {
  const ars = approvalRequests.filter((a) => a.ruleId === ruleId);
  return { submitted: ars[0], approved: ars.find((a) => a.stage === "Approved") };
}

export function buildColumns(actions: RepositoryActions, context: RepositoryColumnContext): ColumnDef<BusinessRule>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={!table.getIsAllPageRowsSelected() && table.getIsSomePageRowsSelected()}
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="Select all rules on this page"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          aria-label={`Select ${row.original.id}`}
        />
      ),
      size: 36,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "id",
      header: ({ column }) => <SortHeader label="Rule ID" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />,
      cell: ({ row }) => <span className="font-mono text-sm font-medium">{row.original.id}</span>,
      size: 90,
    },
    {
      accessorKey: "name",
      header: ({ column }) => <SortHeader label="Rule Name" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />,
      cell: ({ row }) => (
        <button onClick={() => actions.onEdit(row.original)} className="text-left font-medium hover:text-primary hover:underline">
          {row.original.name}
        </button>
      ),
      size: 260,
    },
    {
      accessorKey: "category",
      header: "Category",
      size: 120,
    },
    {
      id: "mappedProducts",
      header: "Mapped Product(s)",
      cell: ({ row }) => {
        const names = context.productRuleMappings
          .filter((m) => m.ruleId === row.original.id)
          .map((m) => context.products.find((p) => p.id === m.productId)?.name ?? m.productId);
        if (names.length === 0) return <span className="text-sm text-muted-foreground/50">Unmapped</span>;
        return (
          <div className="flex max-w-56 flex-wrap gap-1">
            {names.map((n) => (
              <span key={n} className="rounded-md border border-border/80 bg-muted/60 px-1.5 py-0.5 text-sm">{n}</span>
            ))}
          </div>
        );
      },
      size: 180,
    },
    {
      accessorKey: "status",
      header: "Approval Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
      size: 130,
    },
    {
      id: "submittedBy",
      header: "Submitted By",
      cell: ({ row }) => {
        const { submitted } = govFor(row.original.id, context.approvalRequests);
        return submitted ? (
          <span className="text-sm">
            {submitted.requestedBy}
            <span className="block text-sm text-muted-foreground">{formatDistanceToNow(new Date(submitted.requestedAt), { addSuffix: true })}</span>
          </span>
        ) : (
          <span className="text-sm text-muted-foreground/50">—</span>
        );
      },
      size: 150,
    },
    {
      id: "approvedBy",
      header: "Approved By",
      cell: ({ row }) => {
        const { approved } = govFor(row.original.id, context.approvalRequests);
        return approved?.decidedBy ? (
          <span className="text-sm">
            {approved.decidedBy}
            <span className="block text-sm text-muted-foreground">{approved.decidedAt ? formatDistanceToNow(new Date(approved.decidedAt), { addSuffix: true }) : ""}</span>
          </span>
        ) : (
          <span className="text-sm text-muted-foreground/50">—</span>
        );
      },
      size: 150,
    },
    // FUTURE: Environment column removed for demo. Restore column definition:
    // { accessorKey: "environment", header: "Environment", cell: ({ row }) => <EnvironmentBadge environment={row.original.environment} />, size: 110 },
    // FUTURE: Owner column removed for demo. Restore column definition:
    // {
    //   accessorKey: "owner",
    //   header: "Owner",
    //   cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.owner}</span>,
    //   size: 170,
    // },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => <SortHeader label="Updated" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(row.original.updatedAt), { addSuffix: true })}
        </span>
      ),
      size: 120,
    },
    {
      id: "actions",
      header: "",
      size: 50,
      cell: ({ row }) => {
        const r = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => actions.onView(r)}>
                <Eye className="size-3.5" /> View
              </DropdownMenuItem>
              {r.status !== "Archived" && context.canEdit && (
                <DropdownMenuItem onClick={() => actions.onEdit(r)}>
                  <FileEdit className="size-3.5" /> Edit
                </DropdownMenuItem>
              )}
              {context.canCreate && (
                <DropdownMenuItem onClick={() => actions.onClone(r)}>
                  <Copy className="size-3.5" /> Clone
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />

              {(r.status === "Draft" || r.status === "Rejected") && context.canEdit && (
                <DropdownMenuItem onClick={() => actions.onSubmitForReview(r)}>
                  <FlaskConical className="size-3.5" /> Submit Rule
                </DropdownMenuItem>
              )}
              {r.status === "Pending Approval" && (
                <>
                  <DropdownMenuItem onClick={() => actions.onTestInSimulator(r)}>
                    <TestTube2 className="size-3.5" /> Test in Simulator
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => actions.onApprove(r)} disabled={!context.canPublish}>
                    <CheckCheck className="size-3.5" /> Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => actions.onReject(r)} disabled={!context.canPublish}>
                    <Undo2 className="size-3.5" /> Reject
                  </DropdownMenuItem>
                </>
              )}
              {r.status === "Approved" && (
                <>
                  <DropdownMenuItem onClick={() => actions.onPublish(r)} disabled={!context.canPublish}>
                    <Rocket className="size-3.5" /> Publish
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => actions.onReject(r)} disabled={!context.canPublish}>
                    <Undo2 className="size-3.5" /> Reject
                  </DropdownMenuItem>
                </>
              )}
              {r.status === "Published" && (
                <DropdownMenuItem onClick={() => actions.onDisable(r)} disabled={!context.canPublish}>
                  <Ban className="size-3.5" /> Disable
                </DropdownMenuItem>
              )}
              {r.status === "Inactive" && (
                <DropdownMenuItem onClick={() => actions.onReactivate(r)} disabled={!context.canPublish}>
                  <PlayCircle className="size-3.5" /> Re-activate
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />
              {r.status !== "Archived" && (
                <DropdownMenuItem onClick={() => actions.onArchive(r)} disabled={!context.canPublish}>
                  <Archive className="size-3.5" /> Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuItem variant="destructive" onClick={() => actions.onDelete(r)} disabled={!context.canDelete}>
                <Trash2 className="size-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
