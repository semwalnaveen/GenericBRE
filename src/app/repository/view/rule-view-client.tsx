"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, AlertTriangle, CheckCheck, Undo2 } from "lucide-react";
import { useAppStore, useHasCapability } from "@/lib/store";
import { BusinessRule } from "@/lib/types";
import { detectConflictsForCandidate, RuleConflict } from "@/lib/conflict-detection";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
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
import { RuleDetailView } from "@/components/repository/rule-detail-view";

export function RuleViewClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ruleId = searchParams.get("id");

  const rules = useAppStore((s) => s.rules);
  const approveRule = useAppStore((s) => s.approveRule);
  const rejectRule = useAppStore((s) => s.rejectRule);
  const productRuleMappings = useAppStore((s) => s.productRuleMappings);
  const canPublish = useHasCapability("rule.publish");

  const [approvalConfirm, setApprovalConfirm] = useState<{ rule: BusinessRule; conflicts: RuleConflict[]; remarks?: string } | null>(null);

  const rule = rules.find((r) => r.id === ruleId) ?? null;

  const performApprove = useCallback(
    (r: BusinessRule) => {
      const result = approveRule(r.id);
      if (result.ok) {
        toast.success(`${r.id} approved & published`, { description: `${r.name} is now live.` });
        router.push("/repository");
      } else {
        toast.error("Approval blocked", { description: result.reason });
      }
    },
    [approveRule, router]
  );

  const handleApprove = (r: BusinessRule) => {
    const candidateConflicts = detectConflictsForCandidate(r, rules);
    const remarks = productRuleMappings.find((m) => m.ruleId === r.id)?.remarks;
    if (candidateConflicts.length > 0 || remarks) {
      setApprovalConfirm({ rule: r, conflicts: candidateConflicts, remarks });
    } else {
      performApprove(r);
    }
  };

  const handleReject = (r: BusinessRule) => {
    const result = rejectRule(r.id);
    if (result.ok) {
      toast.info(`${r.id} rejected`, { description: `${r.name} sent back — edit and resubmit.` });
      router.push("/repository");
    } else {
      toast.error("Action blocked", { description: result.reason });
    }
  };

  if (!rule) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <h1 className="text-base font-semibold">Rule Not Found</h1>
        <p className="max-w-sm text-sm text-muted-foreground">The rule {ruleId} does not exist or was deleted.</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/repository")}>Back to Repository</Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-muted/30">
      <div className="flex shrink-0 flex-col gap-2 border-b bg-card/60 px-5 py-3 sm:px-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => router.push("/repository")} className="cursor-pointer">Rule Repository</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{rule.id}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => router.push("/repository")}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-base font-semibold tracking-tight">{rule.name}</h1>
            <p className="text-sm text-muted-foreground">{rule.id} · Read-only rule detail</p>
          </div>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="w-full px-5 py-5 sm:px-6">
          <RuleDetailView rule={rule} />
        </div>
      </ScrollArea>

      {rule.status === "Pending Approval" && (
        <div className="sticky bottom-0 mt-auto flex items-center justify-end gap-2 border-t bg-card/80 p-4 backdrop-blur-md">
          <Button variant="outline" className="gap-1.5" disabled={!canPublish} onClick={() => handleReject(rule)}>
            <Undo2 className="size-4" /> Reject
          </Button>
          <Button className="gap-1.5" disabled={!canPublish} onClick={() => handleApprove(rule)}>
            <CheckCheck className="size-4" /> Approve
          </Button>
        </div>
      )}

      <AlertDialog open={!!approvalConfirm} onOpenChange={(v) => !v && setApprovalConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" />
              {approvalConfirm && approvalConfirm.conflicts.length > 0 ? "Possible conflict detected" : "Review before approving"}
            </AlertDialogTitle>
            {approvalConfirm && approvalConfirm.conflicts.length > 0 && (
              <AlertDialogDescription>
                Publishing {approvalConfirm.rule.id} would create
                {approvalConfirm.conflicts.length > 1 ? " these conflicts" : " this conflict"} with
                rules already Active. You can still approve — this is advisory, not a hard block.
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          {approvalConfirm && approvalConfirm.conflicts.length > 0 && (
            <ul className="space-y-1.5 rounded-lg border bg-destructive/5 p-2.5 text-sm">
              {approvalConfirm.conflicts.map((c, i) => (
                <li key={i} className="text-destructive">
                  {c.ruleAId} vs {c.ruleBId} — {c.reason}
                </li>
              ))}
            </ul>
          )}
          {approvalConfirm?.remarks && (
            <div className="space-y-1 rounded-lg border bg-muted/30 p-2.5 text-sm">
              <p className="font-semibold text-muted-foreground">Submission Remarks</p>
              <p className="whitespace-pre-wrap">{approvalConfirm.remarks}</p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (approvalConfirm) performApprove(approvalConfirm.rule);
                setApprovalConfirm(null);
              }}
            >
              Approve Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
