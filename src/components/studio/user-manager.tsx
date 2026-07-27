"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Mail, Building2, ShieldCheck, Search } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { AppUser, Capability } from "@/lib/types";
import { ALL_CAPABILITIES, capabilityLabel } from "@/lib/capabilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";

function blankUser(): AppUser {
  const now = new Date().toISOString();
  return {
    id: "",
    name: "",
    email: "",
    role: "",
    department: "",
    status: "Active",
    permissions: ["rule.view"],
    approvalCategories: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function UserManager() {
  const users = useAppStore((s) => s.users);
  const products = useAppStore((s) => s.products);
  const ruleCategories = useAppStore((s) => s.ruleCategories);
  const addUser = useAppStore((s) => s.addUser);
  const updateUser = useAppStore((s) => s.updateUser);
  const deleteUser = useAppStore((s) => s.deleteUser);

  const [editing, setEditing] = useState<AppUser | null>(null);
  const [draft, setDraft] = useState<AppUser>(blankUser());
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AppUser | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        (u.department && u.department.toLowerCase().includes(q))
    );
  }, [users, search]);

  const startCreate = () => {
    setEditing(null);
    setDraft(blankUser());
    setOpen(true);
  };
  const startEdit = (user: AppUser) => {
    setEditing(user);
    setDraft(user);
    setOpen(true);
  };

  const togglePermission = (cap: Capability) => {
    setDraft((d) => ({
      ...d,
      permissions: d.permissions.includes(cap) ? d.permissions.filter((c) => c !== cap) : [...d.permissions, cap],
    }));
  };

  const toggleApprovalCategory = (categoryName: string) => {
    setDraft((d) => ({
      ...d,
      approvalCategories: d.approvalCategories.includes(categoryName)
        ? d.approvalCategories.filter((c) => c !== categoryName)
        : [...d.approvalCategories, categoryName],
    }));
  };

  const save = () => {
    if (!draft.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    if (!draft.email.trim()) {
      toast.error("Email is required.");
      return;
    }
    if (!draft.role) {
      toast.error("Job Title is required.");
      return;
    }
    if (editing) {
      updateUser(editing.id, draft);
      toast.success(`"${draft.name}" updated.`);
    } else {
      const id = `usr-${draft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now().toString(36)}`;
      addUser({ ...draft, id });
      toast.success(`"${draft.name}" added.`);
    }
    setOpen(false);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteUser(pendingDelete.id);
    toast.info(`"${pendingDelete.name}" removed.`);
    setPendingDelete(null);
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users or roles..."
              className="h-9 pl-8 text-sm"
            />
          </div>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm font-medium text-muted-foreground">
            {filteredUsers.length} Users Configured
          </span>
        </div>

        <Button size="sm" className="gap-1.5 font-medium shadow-xs" onClick={startCreate}>
          <Plus className="size-3.5" /> Add User
        </Button>
      </div>

      {/* Users Cards Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredUsers.map((user) => (
          <div
            key={user.id}
            className="group relative flex flex-col justify-between rounded-xl border bg-card p-3.5 transition-all duration-150 hover:border-primary/40 hover:shadow-xs"
          >
            <div className="flex items-start gap-2.5 justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary shadow-2xs">
                  {user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?"}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-semibold tracking-tight text-foreground">{user.name}</p>
                    <Badge
                      variant={user.status === "Active" ? "outline" : "secondary"}
                      className={cn(
                        "shrink-0 text-sm py-0 h-5",
                        user.status === "Active" && "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {user.status}
                    </Badge>
                  </div>
                  <p className="truncate text-sm font-medium text-muted-foreground">{user.role}</p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-0.5 opacity-80 transition-opacity group-hover:opacity-100">
                <Button variant="ghost" size="icon-sm" className="size-7" onClick={() => startEdit(user)} title="Edit User">
                  <Pencil className="size-3 text-muted-foreground hover:text-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-7"
                  onClick={() => setPendingDelete(user)}
                  title="Delete User"
                >
                  <Trash2 className="size-3 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            </div>

            <div className="mt-3.5 space-y-2 border-t pt-2.5">
              <div>
                <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Permissions</p>
                <div className="max-h-[76px] overflow-y-auto pr-1 flex flex-wrap items-center gap-1.5 scrollbar-thin">
                  {user.permissions.length === 0 ? (
                    <span className="text-sm text-muted-foreground/60 italic">None</span>
                  ) : (
                    user.permissions.map((c) => (
                      <span key={c} className="rounded-md border border-border/80 bg-muted/60 px-2 py-0.5 text-sm font-mono font-medium text-foreground">
                        {capabilityLabel(c)}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="mb-1 flex items-center gap-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  <ShieldCheck className="size-3 text-amber-500" /> Approvals
                </p>
                <div className="flex flex-wrap items-center gap-1">
                  {user.approvalCategories.length === 0 ? (
                    <span className="text-sm text-muted-foreground/60 italic">None assigned</span>
                  ) : (
                    user.approvalCategories.map((cat) => (
                      <span key={cat} className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-sm font-medium text-amber-700 dark:text-amber-400">
                        {cat}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {filteredUsers.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
            <ShieldCheck className="size-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium text-foreground">No users found</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {search ? "No users match your search filter." : "No users configured yet."}
            </p>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit User" : "Add User"}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder="e.g. Kavita Rao"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={draft.email}
                  onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                  placeholder="e.g. kavita.rao@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Job Title *</Label>
                <Input
                  value={draft.role}
                  onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
                  placeholder="e.g. Credit Risk Manager"
                />
                <p className="text-sm text-muted-foreground">
                  Free-text title, shown on the roster — access is granted separately below via System Permissions, not this field.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Input
                  value={draft.department}
                  onChange={(e) => setDraft((d) => ({ ...d, department: e.target.value }))}
                  placeholder="e.g. Credit Risk"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Status</Label>
                <Select value={draft.status} onValueChange={(v) => setDraft((d) => ({ ...d, status: (v as AppUser["status"]) ?? "Active" }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>System Permissions</Label>
              <div className="grid grid-cols-2 gap-2 rounded-lg border p-2.5">
                {ALL_CAPABILITIES.map((cap) => (
                  <label key={cap} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={draft.permissions.includes(cap)} onCheckedChange={() => togglePermission(cap)} />
                    {capabilityLabel(cap)}
                  </label>
                ))}
              </div>
            </div>



            <div className="rounded-lg border bg-muted/20 p-3">
              <Label className="text-sm">Category</Label>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Select the business rule categories this user is authorized to approve. A single user may approve multiple rule categories.
              </p>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                {ruleCategories.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={draft.approvalCategories.includes(cat.name)}
                      onCheckedChange={() => toggleApprovalCategory(cat.name)}
                    />
                    {cat.name}
                  </label>
                ))}
                {ruleCategories.length === 0 && (
                  <p className="col-span-2 text-sm text-muted-foreground">
                    No rule categories configured yet — add one in Rule Categories first.
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={save}>{editing ? "Save Changes" : "Add User"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove &quot;{pendingDelete?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              They will no longer appear on the User Management roster, and any rule-approval categories assigned to them will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
