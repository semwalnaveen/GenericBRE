"use client";

import { useState } from "react";
import { Workflow, X, Plus, Save, Rocket } from "lucide-react";
import { NotifyWorkflow, NotifyStep, NotifyCategory, NotifyTrigger, NotifyActionType } from "@/lib/types";
import {
  NOTIFY_ACTION_TYPES,
  NOTIFY_ACTIONS_WITHOUT_MESSAGE,
  NOTIFY_CONDITION_FIELDS,
  NOTIFY_DELAYS,
  NOTIFY_OPERATORS,
  NOTIFY_STEP_STYLES,
} from "@/lib/notify-vocabulary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

let stepIdCounter = 0;
const newStepId = () => `ns-new-${Date.now()}-${++stepIdCounter}`;

function defaultStep(kind: NotifyStep["kind"], recipients: string[]): NotifyStep {
  if (kind === "condition") {
    return { id: newStepId(), kind, field: NOTIFY_CONDITION_FIELDS[0], operator: "is", value: "" };
  }
  if (kind === "wait") {
    return { id: newStepId(), kind, duration: NOTIFY_DELAYS[0] };
  }
  return { id: newStepId(), kind: "action", actionType: NOTIFY_ACTION_TYPES[0], recipient: recipients[0] ?? "", message: "" };
}

export function WorkflowBuilderDialog({
  open,
  onOpenChange,
  workflow,
  isNew,
  categories,
  triggers,
  recipients,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workflow: NotifyWorkflow;
  isNew: boolean;
  categories: NotifyCategory[];
  triggers: NotifyTrigger[];
  recipients: string[];
  onSave: (workflow: NotifyWorkflow, intent: "draft" | "activate") => void;
}) {
  // Seeded once from `workflow` — the caller remounts this dialog per subject
  // via `key={workflow.id}` (see notify-x-manager.tsx), same as the source
  // blueprint's builder, so a fresh `draft` is naturally created per subject
  // without an effect.
  const [draft, setDraft] = useState<NotifyWorkflow>(workflow);

  const triggersForCategory = triggers.filter((t) => t.categoryId === draft.categoryId);

  const setCategory = (categoryId: string) => {
    const firstTrigger = triggers.find((t) => t.categoryId === categoryId);
    setDraft((d) => ({ ...d, categoryId, triggerId: firstTrigger?.id ?? d.triggerId }));
  };

  const updateStep = (id: string, patch: Partial<NotifyStep>) => {
    setDraft((d) => ({
      ...d,
      steps: d.steps.map((s) => (s.id === id ? ({ ...s, ...patch } as NotifyStep) : s)),
    }));
  };
  const deleteStep = (id: string) => setDraft((d) => ({ ...d, steps: d.steps.filter((s) => s.id !== id) }));
  const addStep = (kind: NotifyStep["kind"]) => setDraft((d) => ({ ...d, steps: [...d.steps, defaultStep(kind, recipients)] }));

  const save = (intent: "draft" | "activate") => {
    if (intent === "activate" && !draft.name.trim()) return;
    onSave({ ...draft, status: intent === "activate" ? "Active" : "Draft" }, intent);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] w-screen max-w-none flex-col overflow-hidden sm:max-w-none !rounded-none border-none p-4 sm:p-6 md:p-8">
        <DialogHeader className="shrink-0 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Workflow className="size-5 text-primary" /> {isNew ? "Create Workflow" : `Edit — ${workflow.name}`}
          </DialogTitle>
          <DialogDescription className="text-sm">Define trigger, conditions, and automated actions.</DialogDescription>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-2 space-y-4 my-2">
          <div className="space-y-2.5 rounded-xl border p-3.5 bg-card">
            <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Workflow Details</p>
            <div className="space-y-1.5">
              <Label className="text-sm">Name *</Label>
              <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="e.g. Rule Review Reminder" className="text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <Label className="text-sm">Category</Label>
                <Select value={draft.categoryId} onValueChange={(v) => setCategory(v as string)}>
                  <SelectTrigger className="w-full text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Status</Label>
                <Select value={draft.status} onValueChange={(v) => setDraft((d) => ({ ...d, status: v as NotifyWorkflow["status"] }))}>
                  <SelectTrigger className="w-full text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 rounded-xl border border-primary/25 bg-primary/5 p-3.5">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">⚡ WHEN — Trigger Event</p>
            <Select value={draft.triggerId} onValueChange={(v) => setDraft((d) => ({ ...d, triggerId: v as string }))}>
              <SelectTrigger className="w-full text-sm bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                {triggersForCategory.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {draft.steps.map((step) => (
              <div key={step.id} className={cn("space-y-2 rounded-lg border p-3", NOTIFY_STEP_STYLES[step.kind].classes)}>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-background/60 px-1.5 py-0.5 text-sm font-bold">{NOTIFY_STEP_STYLES[step.kind].label}</span>
                  <Button variant="ghost" size="icon-sm" className="size-6" onClick={() => deleteStep(step.id)}>
                    <X className="size-3" />
                  </Button>
                </div>

                {step.kind === "condition" && (
                  <div className="grid grid-cols-3 gap-2">
                    <Select value={step.field} onValueChange={(v) => updateStep(step.id, { field: v as string })}>
                      <SelectTrigger size="sm" className="h-8 w-full bg-background text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {NOTIFY_CONDITION_FIELDS.map((f) => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={step.operator} onValueChange={(v) => updateStep(step.id, { operator: v as "is" | "is not" | "contains" })}>
                      <SelectTrigger size="sm" className="h-8 w-full bg-background text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {NOTIFY_OPERATORS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={step.value}
                      onChange={(e) => updateStep(step.id, { value: e.target.value })}
                      placeholder="Value"
                      className="h-8 bg-background text-sm"
                    />
                  </div>
                )}

                {step.kind === "action" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={step.actionType} onValueChange={(v) => updateStep(step.id, { actionType: v as NotifyActionType })}>
                        <SelectTrigger size="sm" className="h-8 w-full bg-background text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {NOTIFY_ACTION_TYPES.map((a) => (
                            <SelectItem key={a} value={a}>{a}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={step.recipient} onValueChange={(v) => updateStep(step.id, { recipient: v as string })}>
                        <SelectTrigger size="sm" className="h-8 w-full bg-background text-sm"><SelectValue placeholder="Recipient" /></SelectTrigger>
                        <SelectContent>
                          {recipients.map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {!NOTIFY_ACTIONS_WITHOUT_MESSAGE.includes(step.actionType) && (
                      <Input
                        value={step.message ?? ""}
                        onChange={(e) => updateStep(step.id, { message: e.target.value })}
                        placeholder="Message"
                        className="h-8 bg-background text-sm"
                      />
                    )}
                  </>
                )}

                {step.kind === "wait" && (
                  <Select value={step.duration} onValueChange={(v) => updateStep(step.id, { duration: v as string })}>
                    <SelectTrigger size="sm" className="h-8 w-full bg-background text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {NOTIFY_DELAYS.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Fixed Step Controls & Actions */}
        <div className="flex shrink-0 items-center gap-1.5 pt-2 border-t">
          <span className="text-sm font-medium text-muted-foreground">Add step:</span>
          <Button variant="outline" size="sm" className={cn("h-7 gap-1 text-sm", NOTIFY_STEP_STYLES.condition.classes)} onClick={() => addStep("condition")}>
            <Plus className="size-3" /> IF Condition
          </Button>
          <Button variant="outline" size="sm" className={cn("h-7 gap-1 text-sm", NOTIFY_STEP_STYLES.action.classes)} onClick={() => addStep("action")}>
            <Plus className="size-3" /> THEN Action
          </Button>
          <Button variant="outline" size="sm" className={cn("h-7 gap-1 text-sm", NOTIFY_STEP_STYLES.wait.classes)} onClick={() => addStep("wait")}>
            <Plus className="size-3" /> WAIT Delay
          </Button>
        </div>

        <DialogFooter className="shrink-0 pt-4 border-t mt-auto">
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button variant="outline" className="gap-2" onClick={() => save("draft")}>
            <Save className="size-4" /> Save as Draft
          </Button>
          <Button className="gap-2" onClick={() => save("activate")} disabled={!draft.name.trim()}>
            <Rocket className="size-4" /> Activate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
