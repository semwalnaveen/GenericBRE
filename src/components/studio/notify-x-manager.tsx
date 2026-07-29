"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAppStore, useHasCapability } from "@/lib/store";
import { NotifyWorkflow } from "@/lib/types";
import { WorkflowCatalog } from "@/components/notifyx/workflow-catalog";
import { WorkflowDetail } from "@/components/notifyx/workflow-detail";
import { WorkflowBuilderDialog } from "@/components/notifyx/workflow-builder-dialog";
import { TemplateGalleryDialog } from "@/components/notifyx/template-gallery-dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

function blankWorkflow(categoryId: string, triggerId: string, createdBy: string): NotifyWorkflow {
  const now = new Date().toISOString();
  return {
    id: "",
    name: "",
    categoryId,
    triggerId,
    status: "Draft",
    steps: [],
    createdAt: now,
    updatedAt: now,
    createdBy,
    runCount: 0,
    logs: [],
  };
}

// NotifyX — trigger -> condition -> action workflow automation configurator.
// Mirrors ProductManager/RuleTemplatesManager's composition shape (list state
// + detail swap + dialog orchestration), all driven by the notifyWorkflows
// store slice — see src/lib/store.ts.
export function NotifyXManager() {
  const workflows = useAppStore((s) => s.notifyWorkflows);
  const categories = useAppStore((s) => s.notifyCategories);
  const triggers = useAppStore((s) => s.notifyTriggers);
  const templates = useAppStore((s) => s.notifyWorkflowTemplates);
  const jobTitles = useAppStore((s) => s.jobTitles);
  const currentUser = useAppStore((s) => s.currentUser);
  const addNotifyWorkflow = useAppStore((s) => s.addNotifyWorkflow);
  const updateNotifyWorkflow = useAppStore((s) => s.updateNotifyWorkflow);
  const deleteNotifyWorkflow = useAppStore((s) => s.deleteNotifyWorkflow);
  const toggleNotifyWorkflowStatus = useAppStore((s) => s.toggleNotifyWorkflowStatus);
  const cloneNotifyWorkflow = useAppStore((s) => s.cloneNotifyWorkflow);
  const importNotifyWorkflowTemplate = useAppStore((s) => s.importNotifyWorkflowTemplate);

  const canView = useHasCapability("notifyx.view");
  const canCreate = useHasCapability("notifyx.create");
  const canEdit = useHasCapability("notifyx.edit");
  const canToggle = useHasCapability("notifyx.toggle");

  const recipients = [...jobTitles.map((jt) => jt.name), "All Stakeholders"];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [builderTarget, setBuilderTarget] = useState<{ workflow: NotifyWorkflow; isNew: boolean } | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<NotifyWorkflow | null>(null);

  const selected = selectedId ? workflows.find((w) => w.id === selectedId) ?? null : null;

  const openCreate = () => {
    const category = categories[0];
    const trigger = triggers.find((t) => t.categoryId === category?.id);
    setBuilderTarget({ workflow: blankWorkflow(category?.id ?? "", trigger?.id ?? "", currentUser.name), isNew: true });
  };
  const openEdit = (workflow: NotifyWorkflow) => setBuilderTarget({ workflow, isNew: false });

  const handleSave = (workflow: NotifyWorkflow) => {
    if (builderTarget?.isNew) {
      const id = `wf-${Date.now()}`;
      addNotifyWorkflow({ ...workflow, id });
      toast.success(`"${workflow.name}" created as ${workflow.status}.`);
    } else {
      updateNotifyWorkflow(workflow.id, workflow);
      toast.success(`"${workflow.name}" updated.`);
    }
    setBuilderTarget(null);
  };

  const handleImportTemplate = (templateId: string) => {
    importNotifyWorkflowTemplate(templateId);
    setTemplateOpen(false);
    toast.success("Template imported as a new Draft workflow.");
  };

  const handleDelete = () => {
    if (!pendingDelete) return;
    deleteNotifyWorkflow(pendingDelete.id);
    toast.info(`"${pendingDelete.name}" deleted.`);
    setPendingDelete(null);
    setSelectedId(null);
  };

  if (!canView) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
        You don&apos;t have access to NotifyX. Contact a System Administrator if you need this.
      </div>
    );
  }

  return (
    <div className="h-full">
      {selected ? (
        <WorkflowDetail
          workflow={selected}
          category={categories.find((c) => c.id === selected.categoryId)}
          trigger={triggers.find((t) => t.id === selected.triggerId)}
          canEdit={canEdit}
          canToggle={canToggle}
          onBack={() => setSelectedId(null)}
          onEdit={() => openEdit(selected)}
          onToggle={() => toggleNotifyWorkflowStatus(selected.id)}
          onDelete={() => setPendingDelete(selected)}
        />
      ) : (
        <WorkflowCatalog
          workflows={workflows}
          categories={categories}
          triggers={triggers}
          canCreate={canCreate}
          canEdit={canEdit}
          canToggle={canToggle}
          onCreate={openCreate}
          onImportTemplate={() => setTemplateOpen(true)}
          onEdit={openEdit}
          onView={(w) => setSelectedId(w.id)}
          onToggle={(w) => toggleNotifyWorkflowStatus(w.id)}
          onClone={(w) => cloneNotifyWorkflow(w.id)}
        />
      )}

      {builderTarget && (
        <WorkflowBuilderDialog
          key={builderTarget.isNew ? "new" : builderTarget.workflow.id}
          open
          onOpenChange={(v) => !v && setBuilderTarget(null)}
          workflow={builderTarget.workflow}
          isNew={builderTarget.isNew}
          categories={categories}
          triggers={triggers}
          recipients={recipients}
          onSave={handleSave}
        />
      )}

      <TemplateGalleryDialog
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        templates={templates}
        categories={categories}
        triggers={triggers}
        onImport={(t) => handleImportTemplate(t.id)}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{pendingDelete?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>This Draft workflow will be permanently removed. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
