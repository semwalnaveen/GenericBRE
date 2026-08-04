"use client";

import { useState } from "react";
import {
  Plus,
  FolderPlus,
  Trash2,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  GripVertical,
  Copy,
  CopyPlus,
  ClipboardPaste,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  Layers,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Condition, ConditionGroup, Connector, Domain } from "@/lib/types";
import { emptyCondition, emptyGroup, countConditions, effectiveConnector } from "@/lib/condition-tree";
import { getDragPayload, clearDragPayload, setDragPayload } from "./builder-shared";
import { ConditionEditor } from "./condition-editor";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Chip color per connector — blue=AND, amber=OR (mirrors the rest of the
// builder), muted/neutral=N.A. since it's an exclusion, not a boolean join.
const CONNECTOR_STYLES: Record<Connector, string> = {
  AND: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  OR: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "N.A.": "border-dashed border-muted-foreground/30 bg-muted/40 text-muted-foreground",
};

type TreeNode = Condition | ConditionGroup;

// Handlers threaded through every nesting level unchanged — all tree
// mutations run through rule-builder/page.tsx's commitRule, so undo/redo and
// autosave cover drag/paste/duplicate for free.
export interface TreeHandlers {
  onUpdate: (id: string, patch: Partial<TreeNode>) => void;
  /** Sets a group's default logic and cascades it onto every existing
   *  child's connector — the header AND/OR acting as "make them all X",
   *  while each connector chip stays individually overridable after. */
  onSetGroupLogic: (groupId: string, logic: "AND" | "OR") => void;
  onDelete: (id: string) => void;
  onAddChild: (groupId: string, child: TreeNode) => void;
  onDuplicate: (id: string) => void;
  onCopy: (id: string) => void;
  onPaste: (groupId: string) => void;
  onMoveNode: (nodeId: string, targetGroupId: string, index: number) => void;
  onMoveUpDown: (id: string, delta: -1 | 1) => void;
  onInsertField: (groupId: string, index: number, fieldKey: string) => void;
  onToggleSelect: (id: string) => void;
}

interface GroupEditorProps {
  group: ConditionGroup;
  domain: Domain;
  handlers: TreeHandlers;
  /** Omit to disable multi-select entirely (e.g. Rule Templates' editor). */
  selection?: Set<string>;
  clipboardCount: number;
  isRoot?: boolean;
  /** The rule being edited — threaded down so ConditionEditor can exclude
   *  its own outputs from its "Generated Variables" list (rule chaining is
   *  global, see src/lib/rule-chaining.ts). Absent for Rule Templates. */
  currentRuleId?: string;
  /** Optional — renders a "CASE" toolbar button on the root group, beside
   *  Condition/Group, when provided. Additive-only: omitted entirely (no
   *  button, no behavior change) for any caller that doesn't pass it, e.g.
   *  Rule Templates' editor. */
  onOpenCaseBuilder?: () => void;
}

function collectGroupIds(group: ConditionGroup, out: string[] = []): string[] {
  out.push(group.id);
  for (const child of group.children) {
    if (child.type === "group") collectGroupIds(child, out);
  }
  return out;
}

// The connector rail between sibling rows — for the 2nd+ child in a group,
// shows THAT CHILD's own AND/OR/N.A connector (a dropdown, not a toggle —
// each item's choice only ever affects itself), and doubles as the drop
// target for inserting a dragged node/field at exactly this position.
function ConnectorDropRow({
  group,
  index,
  handlers,
  showChip,
}: {
  group: ConditionGroup;
  index: number;
  handlers: TreeHandlers;
  showChip: boolean;
}) {
  const [active, setActive] = useState(false);
  const child = showChip ? group.children[index] : undefined;
  const connector = child ? effectiveConnector(group, index) : null;
  return (
    <div
      onDragOver={(e) => {
        if (getDragPayload()) {
          e.preventDefault();
          setActive(true);
        }
      }}
      onDragLeave={() => setActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        const payload = getDragPayload();
        setActive(false);
        clearDragPayload();
        if (!payload) return;
        if (payload.kind === "node") handlers.onMoveNode(payload.nodeId, group.id, index);
        else handlers.onInsertField(group.id, index, payload.fieldKey);
      }}
      className={cn(
        "flex items-center gap-2 rounded transition-all",
        showChip ? "py-0.5" : "h-2",
        active && "h-8 border-2 border-dashed border-primary/60 bg-primary/10"
      )}
    >
      {child && connector && !active && (
        <>
          <Select value={connector} onValueChange={(v) => handlers.onUpdate(child.id, { connector: v as Connector })}>
            <SelectTrigger
              size="sm"
              title="How this condition/group joins the ones before it — applies only to this item"
              className={cn("h-6 gap-1 rounded-md border px-2 py-0 font-mono text-sm font-bold tracking-wider", CONNECTOR_STYLES[connector])}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="AND" className="font-mono text-sm font-bold">AND</SelectItem>
              <SelectItem value="OR" className="font-mono text-sm font-bold">OR</SelectItem>
              <SelectItem value="N.A." className="font-mono text-sm font-bold text-muted-foreground">N.A.</SelectItem>
            </SelectContent>
          </Select>
          <div className="h-px flex-1 bg-border/60" />
        </>
      )}
      {active && <p className="w-full text-center text-sm font-medium text-primary">Drop here</p>}
    </div>
  );
}

export function ConditionGroupEditor({ group, domain, handlers, selection, clipboardCount, isRoot, currentRuleId, onOpenCaseBuilder }: GroupEditorProps) {
  // Collapse state lives on the group itself (ConditionGroup.collapsed) so it
  // persists with the rule and a root "Collapse All/Expand All" can drive
  // every nested group at once, instead of being local-only UI state.
  const collapsed = !isRoot && !!group.collapsed;
  const [headerDropActive, setHeaderDropActive] = useState(false);
  const selectable = selection !== undefined;
  const selected = !!selection?.has(group.id);
  const anySelection = (selection?.size ?? 0) > 0;

  const headerDropProps = {
    onDragOver: (e: React.DragEvent) => {
      const payload = getDragPayload();
      // Don't offer "drop into this group" while dragging the group itself.
      if (payload && !(payload.kind === "node" && payload.nodeId === group.id)) {
        e.preventDefault();
        e.stopPropagation();
        setHeaderDropActive(true);
      }
    },
    onDragLeave: () => setHeaderDropActive(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const payload = getDragPayload();
      setHeaderDropActive(false);
      clearDragPayload();
      if (!payload) return;
      if (payload.kind === "node") handlers.onMoveNode(payload.nodeId, group.id, group.children.length);
      else handlers.onInsertField(group.id, group.children.length, payload.fieldKey);
    },
  };

  return (
    <div
      className={cn(
        "rounded-xl border transition-all",
        isRoot ? "border-primary/20 bg-background/50 backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.12)] ring-1 ring-primary/5" : "ml-4 border-l-4 border-l-primary/40 border-y-primary/20 border-r-primary/20 bg-card shadow-lg",
        selected && "ring-2 ring-primary/40"
      )}
    >
      <div
        {...headerDropProps}
        className={cn(
          "flex flex-wrap items-center gap-2 border-b px-3 py-2 transition-colors",
          headerDropActive && "bg-primary/10 outline-dashed outline-2 outline-primary/50"
        )}
      >
        {!isRoot && (
          <>
            <span
              draggable
              onDragStart={(e) => {
                setDragPayload({ kind: "node", nodeId: group.id });
                if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
                e.stopPropagation();
              }}
              onDragEnd={clearDragPayload}
              title="Drag to move this group"
              className="flex shrink-0 cursor-grab text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
            >
              <GripVertical className="size-3.5" />
            </span>
            {selectable && (
              <Checkbox
                checked={selected}
                onCheckedChange={() => handlers.onToggleSelect(group.id)}
                className={cn("transition-opacity", anySelection || selected ? "opacity-100" : "opacity-40 hover:opacity-100")}
              />
            )}
            <button onClick={() => handlers.onUpdate(group.id, { collapsed: !collapsed })} className="text-muted-foreground hover:text-foreground">
              {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>
          </>
        )}
        {!isRoot && (
          <span
            className={cn(
              "rounded-md border px-2 py-0.5 font-mono text-sm font-bold tracking-wider",
              "border-border bg-muted/60 text-muted-foreground"
            )}
          >
            (
          </span>
        )}
        {!isRoot && (
          <div className="flex overflow-hidden rounded-md border" title="Sets the default for this group's conditions — each connector below can still be overridden individually">
            <button
              onClick={() => handlers.onSetGroupLogic(group.id, "AND")}
              className={cn(
                "px-2.5 py-1 text-sm font-semibold transition-colors",
                group.logic === "AND" ? "bg-blue-600 text-white" : "hover:bg-accent"
              )}
            >
              AND
            </button>
            <button
              onClick={() => handlers.onSetGroupLogic(group.id, "OR")}
              className={cn(
                "px-2.5 py-1 text-sm font-semibold transition-colors",
                group.logic === "OR" ? "bg-amber-500 text-white" : "hover:bg-accent"
              )}
            >
              OR
            </button>
          </div>
        )}
        <span className="text-sm text-muted-foreground">
          {collapsed
            ? `( ${countConditions(group)} condition${countConditions(group) === 1 ? "" : "s"} )`
            : group.children.length === 0
              ? "matches every case"
              : `of ${group.children.length} condition${group.children.length > 1 ? "s" : ""}`}
        </span>

        <div className="ml-auto flex items-center gap-1">
          {isRoot && group.children.some((c) => c.type === "group") && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-sm text-muted-foreground"
                onClick={() => collectGroupIds(group).forEach((id) => id !== group.id && handlers.onUpdate(id, { collapsed: true }))}
              >
                <ChevronsDownUp className="size-3" /> Collapse All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-sm text-muted-foreground"
                onClick={() => collectGroupIds(group).forEach((id) => id !== group.id && handlers.onUpdate(id, { collapsed: false }))}
              >
                <ChevronsUpDown className="size-3" /> Expand All
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-sm" onClick={() => handlers.onAddChild(group.id, emptyCondition())}>
            <Plus className="size-3" /> Condition
          </Button>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-sm" onClick={() => handlers.onAddChild(group.id, emptyGroup())}>
            <FolderPlus className="size-3" /> Group
          </Button>
          {isRoot && onOpenCaseBuilder && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-sm text-cyan-700 dark:text-cyan-400" onClick={onOpenCaseBuilder}>
              <Layers className="size-3" /> CASE
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" title="More actions" />}>
              <MoreVertical className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={clipboardCount === 0} onClick={() => handlers.onPaste(group.id)}>
                <ClipboardPaste className="size-3.5" /> Paste {clipboardCount > 0 ? `(${clipboardCount})` : ""}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlers.onCopy(group.id)}>
                <Copy className="size-3.5" /> Copy {isRoot ? "All Conditions" : "Group"}
              </DropdownMenuItem>
              {!isRoot && (
                <>
                  <DropdownMenuItem onClick={() => handlers.onDuplicate(group.id)}>
                    <CopyPlus className="size-3.5" /> Duplicate Group
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handlers.onMoveUpDown(group.id, -1)}>
                    <ArrowUp className="size-3.5" /> Move Up
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlers.onMoveUpDown(group.id, 1)}>
                    <ArrowDown className="size-3.5" /> Move Down
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => handlers.onDelete(group.id)}>
                    <Trash2 className="size-3.5" /> Delete Group
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-1.5">
              {group.children.length === 0 && (
                <div
                  onDragOver={(e) => {
                    if (getDragPayload()) e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const payload = getDragPayload();
                    clearDragPayload();
                    if (!payload) return;
                    if (payload.kind === "node") handlers.onMoveNode(payload.nodeId, group.id, 0);
                    else handlers.onInsertField(group.id, 0, payload.fieldKey);
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition-colors",
                    isRoot ? "bg-card/50 border-border" : "bg-background/40 border-primary/20",
                    "hover:bg-muted/40 hover:border-primary/40"
                  )}
                >
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                    <FolderPlus className="size-6 text-primary" />
                  </div>
                  <div className="text-center max-w-sm">
                    <h3 className="text-sm font-semibold text-foreground">
                      {isRoot ? "Start building your rule" : "Empty Condition Group"}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {isRoot 
                        ? "Click '+ Add Condition' or drag a field from the right to get started." 
                        : "Add a condition to this nested group."}
                    </p>
                  </div>
                </div>
              )}
              {group.children.map((child, i) => {
                const excluded = effectiveConnector(group, i) === "N.A.";
                return (
                <div key={child.id} className={cn(excluded && "opacity-50 grayscale-[0.4]")} title={excluded ? "N.A. — excluded from evaluation" : undefined}>
                  <ConnectorDropRow group={group} index={i} handlers={handlers} showChip={i > 0} />
                  {child.type === "condition" ? (
                    <div className="group/row flex items-start gap-1.5">
                      <div className="flex shrink-0 items-center gap-1 pt-2.5">
                        <span
                          draggable
                          onDragStart={(e) => {
                            setDragPayload({ kind: "node", nodeId: child.id });
                            if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
                          }}
                          onDragEnd={clearDragPayload}
                          title="Drag to move this condition"
                          className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
                        >
                          <GripVertical className="size-3.5" />
                        </span>
                        {selectable && (
                          <Checkbox
                            checked={!!selection?.has(child.id)}
                            onCheckedChange={() => handlers.onToggleSelect(child.id)}
                            className={cn(
                              "transition-opacity",
                              anySelection || selection?.has(child.id) ? "opacity-100" : "opacity-0 group-hover/row:opacity-100"
                            )}
                          />
                        )}
                      </div>
                      <div className={cn("min-w-0 flex-1", selection?.has(child.id) && "rounded-lg ring-2 ring-primary/40")}>
                        <ConditionEditor
                          condition={child}
                          domain={domain}
                          currentRuleId={currentRuleId}
                          onChange={(patch) => handlers.onUpdate(child.id, patch)}
                          onDelete={() => handlers.onDelete(child.id)}
                          onDuplicate={() => handlers.onDuplicate(child.id)}
                          onCopy={() => handlers.onCopy(child.id)}
                        />
                      </div>
                    </div>
                  ) : (
                    <ConditionGroupEditor
                      group={child}
                      domain={domain}
                      handlers={handlers}
                      selection={selection}
                      clipboardCount={clipboardCount}
                      currentRuleId={currentRuleId}
                    />
                  )}
                </div>
                );
              })}
              {group.children.length > 0 && <ConnectorDropRow group={group} index={group.children.length} handlers={handlers} showChip={false} />}
            </div>
            {!isRoot && (
              <p className="px-3 pb-1.5 font-mono text-sm font-bold text-muted-foreground/60">)</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
