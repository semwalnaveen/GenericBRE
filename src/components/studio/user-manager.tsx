"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Pencil,
  Search,
  ChevronsUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  KeyRound,
  Download,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { AppUser, Capability, UserProductAccess } from "@/lib/types";
import { CATEGORY_SCOPABLE_CAPABILITIES, capabilityLabel } from "@/lib/capabilities";
import { downloadCsv } from "@/lib/csv";
import { MultiSelect } from "@/components/ui/multi-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

const MAPPING_PAGE_SIZE = 6;
type MappingSortKey = "user" | "product" | "category" | "createdAt";

function blankUser(): AppUser {
  const now = new Date().toISOString();
  return {
    id: "",
    name: "",
    email: "",
    role: "",
    department: "",
    status: "Active",
    isAdmin: false,
    approvalCategories: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function UserManager() {
  const users = useAppStore((s) => s.users);
  const products = useAppStore((s) => s.products);
  const ruleCategories = useAppStore((s) => s.ruleCategories);
  const jobTitles = useAppStore((s) => s.jobTitles);
  const addUser = useAppStore((s) => s.addUser);
  const updateUser = useAppStore((s) => s.updateUser);
  const deleteUser = useAppStore((s) => s.deleteUser);
  const userAccessMappings = useAppStore((s) => s.userAccessMappings);
  const addUserAccessMapping = useAppStore((s) => s.addUserAccessMapping);
  const updateUserAccessMapping = useAppStore((s) => s.updateUserAccessMapping);
  const deleteUserAccessMapping = useAppStore((s) => s.deleteUserAccessMapping);

  const [editing, setEditing] = useState<AppUser | null>(null);
  const [draft, setDraft] = useState<AppUser>(blankUser());
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AppUser | null>(null);

  // User Access Mapping — the table below always lists every user's access;
  // selectedUserId only scopes the Add/Edit Access form (who a new grant
  // applies to, or which user startEditMapping switches context to).
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [formProductId, setFormProductId] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formCapabilities, setFormCapabilities] = useState<Capability[]>([]);
  const [editingMappingId, setEditingMappingId] = useState<string | null>(null);
  const [pendingDeleteMapping, setPendingDeleteMapping] = useState<UserProductAccess | null>(null);
  const [mappingSearch, setMappingSearch] = useState("");
  const [mappingUserFilters, setMappingUserFilters] = useState<string[]>([]);
  const [mappingProductFilters, setMappingProductFilters] = useState<string[]>([]);
  const [mappingCategoryFilters, setMappingCategoryFilters] = useState<string[]>([]);
  const [mappingSort, setMappingSort] = useState<{ key: MappingSortKey; dir: "asc" | "desc" }>({ key: "createdAt", dir: "desc" });
  const [mappingPage, setMappingPage] = useState(1);

  const selectedUser = users.find((u) => u.id === selectedUserId) ?? null;
  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? id;
  const categoryName = (id: string) => ruleCategories.find((c) => c.id === id)?.name ?? id;
  const mappingUserName = (id: string) => users.find((u) => u.id === id)?.name ?? id;
  const categoriesForFormProduct = useMemo(() => {
    if (!formProductId) return [];
    const domain = products.find((p) => p.id === formProductId)?.domain;
    return ruleCategories.filter((c) => !c.industry || c.industry === domain);
  }, [formProductId, ruleCategories, products]);

  const resetMappingForm = () => {
    setFormProductId("");
    setFormCategoryId("");
    setFormCapabilities([]);
    setEditingMappingId(null);
  };

  const toggleFormCapability = (cap: Capability) => {
    setFormCapabilities((caps) => (caps.includes(cap) ? caps.filter((c) => c !== cap) : [...caps, cap]));
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    setUserPickerOpen(false);
    resetMappingForm();
  };

  const handleAddAccess = () => {
    if (!selectedUser) return;
    if (!formProductId || !formCategoryId) {
      toast.error("Select both a Product and a Category before adding access.");
      return;
    }
    if (formCapabilities.length === 0) {
      toast.error("Select at least one System Permission before adding access.");
      return;
    }
    if (editingMappingId) {
      updateUserAccessMapping(editingMappingId, { productId: formProductId, categoryId: formCategoryId, capabilities: formCapabilities });
      toast.success(`Access updated for ${selectedUser.name}.`);
      resetMappingForm();
      return;
    }
    const result = addUserAccessMapping({
      userId: selectedUser.id,
      productId: formProductId,
      categoryId: formCategoryId,
      capabilities: formCapabilities,
    });
    if (!result.ok) {
      toast.error(result.reason ?? "Couldn't add this access.");
      return;
    }
    toast.success(`Granted ${selectedUser.name} ${formCapabilities.length} permission(s) on ${productName(formProductId)} / ${categoryName(formCategoryId)}.`);
    resetMappingForm();
  };

  // Switches the top user picker to the mapping's owner too, so the form
  // (and its "Access updated for X" toast) stays coherent even when editing
  // a row for someone other than whoever was previously selected.
  const startEditMapping = (mapping: UserProductAccess) => {
    setSelectedUserId(mapping.userId);
    setFormProductId(mapping.productId);
    setFormCategoryId(mapping.categoryId);
    setFormCapabilities(mapping.capabilities);
    setEditingMappingId(mapping.id);
  };

  const confirmDeleteMapping = () => {
    if (!pendingDeleteMapping) return;
    deleteUserAccessMapping(pendingDeleteMapping.id);
    toast.info("Access removed.");
    setPendingDeleteMapping(null);
  };

  // Always every user's access — not scoped to the picker above, which only
  // controls who a new/edited grant applies to.
  const allMappings = userAccessMappings;

  const filteredMappings = useMemo(() => {
    const nameOfUser = (id: string) => users.find((u) => u.id === id)?.name ?? id;
    const nameOfProduct = (id: string) => products.find((p) => p.id === id)?.name ?? id;
    const nameOfCategory = (id: string) => ruleCategories.find((c) => c.id === id)?.name ?? id;
    const q = mappingSearch.trim().toLowerCase();

    let rows = allMappings;
    if (mappingUserFilters.length > 0) {
      rows = rows.filter((m) => mappingUserFilters.includes(m.userId));
    }
    if (mappingProductFilters.length > 0) {
      rows = rows.filter((m) => mappingProductFilters.includes(m.productId));
    }
    if (mappingCategoryFilters.length > 0) {
      rows = rows.filter((m) => mappingCategoryFilters.includes(m.categoryId));
    }
    if (q) {
      rows = rows.filter(
        (m) =>
          nameOfUser(m.userId).toLowerCase().includes(q) ||
          nameOfProduct(m.productId).toLowerCase().includes(q) ||
          nameOfCategory(m.categoryId).toLowerCase().includes(q)
      );
    }

    const sorted = [...rows].sort((a, b) => {
      const dir = mappingSort.dir === "asc" ? 1 : -1;
      if (mappingSort.key === "user") return nameOfUser(a.userId).localeCompare(nameOfUser(b.userId)) * dir;
      if (mappingSort.key === "product") return nameOfProduct(a.productId).localeCompare(nameOfProduct(b.productId)) * dir;
      if (mappingSort.key === "category") return nameOfCategory(a.categoryId).localeCompare(nameOfCategory(b.categoryId)) * dir;
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
    });
    return sorted;
  }, [allMappings, mappingSearch, mappingUserFilters, mappingProductFilters, mappingCategoryFilters, mappingSort, products, ruleCategories, users]);

  const totalMappingPages = Math.max(1, Math.ceil(filteredMappings.length / MAPPING_PAGE_SIZE));
  const safeMappingPage = Math.min(mappingPage, totalMappingPages);
  const paginatedMappings = filteredMappings.slice(
    (safeMappingPage - 1) * MAPPING_PAGE_SIZE,
    safeMappingPage * MAPPING_PAGE_SIZE
  );

  const toggleMappingSort = (key: MappingSortKey) => {
    setMappingSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
    setMappingPage(1);
  };
  const sortIndicator = (key: MappingSortKey) =>
    mappingSort.key === key ? (mappingSort.dir === "asc" ? <ChevronUp className="inline size-3" /> : <ChevronDown className="inline size-3" />) : null;

  const exportMappingsCsv = () => {
    downloadCsv(
      "user_access_mapping",
      filteredMappings.map((m) => ({
        User: mappingUserName(m.userId),
        Product: productName(m.productId),
        Category: categoryName(m.categoryId),
        "System Permissions": m.capabilities.map((c) => capabilityLabel(c)).join("; "),
        "Created By": m.createdBy,
        "Created Date": new Date(m.createdAt).toLocaleDateString(),
        Status: m.status,
      }))
    );
    toast.success(`Exported ${filteredMappings.length} access row${filteredMappings.length === 1 ? "" : "s"}.`);
  };

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

  // Job Title is a dropdown sourced entirely from Job Titles & Permissions —
  // selecting one is a one-time copy of its name onto the user's role, not a
  // live link (matches JobTitle's doc comment in types.ts), so it stays
  // freely editable afterward. System Permissions live entirely in User
  // Access Mapping now; approval categories are set independently below.
  const applyJobTitle = (name: string) => {
    setDraft((d) => ({ ...d, role: name }));
  };

  // Base UI's SelectValue only resolves a friendly label when the current
  // value is present in `items` — fold in the user's existing role even if
  // it no longer matches a live Job Title (renamed/deleted since), so the
  // trigger never silently blanks out an existing user's title.
  const jobTitleSelectItems = useMemo(() => {
    const items: Record<string, string> = Object.fromEntries(jobTitles.map((jt) => [jt.name, jt.name]));
    if (draft.role && !items[draft.role]) items[draft.role] = `${draft.role} (no longer a Job Title)`;
    return items;
  }, [jobTitles, draft.role]);

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
      {/* User Access Mapping — per-user, per-Product, per-Category System
          Permissions (a scoped subset of Capability — only rule.* actions
          are meaningful per category). Independent of the Job Title field
          and of Maker-Checker approval categories: this is about which
          rule.* actions a user can take for a given product+category, not
          their platform-wide capabilities or approval authority. */}
      <div className="space-y-4">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <KeyRound className="size-3.5 text-primary" /> User Access Mapping
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Assign product- and category-specific System Permissions to an individual user — Job Title is display-only and never controls this.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Popover open={userPickerOpen} onOpenChange={setUserPickerOpen}>
            <PopoverTrigger render={<Button variant="outline" className="h-auto min-w-64 justify-between gap-2 px-3 py-2" />}>
              {selectedUser ? (
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {selectedUser.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?"}
                  </span>
                  <span className="min-w-0 text-left">
                    <span className="block truncate text-sm font-semibold">{selectedUser.name}</span>
                    <span className="block truncate text-sm text-muted-foreground">{selectedUser.role}</span>
                  </span>
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">Select user…</span>
              )}
              <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-0">
              <Command>
                <CommandInput placeholder="Search user..." />
                <CommandList>
                  <CommandEmpty>No matching users.</CommandEmpty>
                  <CommandGroup>
                    {users.map((u) => (
                      <CommandItem key={u.id} value={`${u.name} ${u.role} ${u.email}`} onSelect={() => handleSelectUser(u.id)} className="gap-2.5">
                        <Check className={cn("size-3.5 shrink-0", selectedUserId === u.id ? "opacity-100" : "opacity-0")} />
                        <span className="min-w-0 flex-1 truncate">{u.name}</span>
                        {u.isAdmin && (
                          <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                            Admin
                          </span>
                        )}
                        <span className="shrink-0 text-sm text-muted-foreground">{u.role}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {selectedUser && (
            <>
              <Button variant="ghost" size="icon-sm" onClick={() => startEdit(selectedUser)} title="Edit User">
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="hover:text-destructive"
                onClick={() => setPendingDelete(selectedUser)}
                title="Delete User"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={startCreate}>
            <Plus className="size-3.5" /> Add User
          </Button>
        </div>

        {!selectedUser ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <KeyRound className="mx-auto mb-2 size-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">Select a user to grant access</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Pick someone from the dropdown above to assign product/category access — the table below already lists every user&apos;s access.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/20 p-3.5 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Product *</Label>
                <Select
                  items={Object.fromEntries(products.map((p) => [p.id, p.name]))}
                  value={formProductId}
                  onValueChange={(v) => {
                    setFormProductId((v as string) ?? "");
                    setFormCategoryId("");
                  }}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select
                  items={Object.fromEntries(categoriesForFormProduct.map((c) => [c.id, c.name]))}
                  value={formCategoryId}
                  onValueChange={(v) => setFormCategoryId((v as string) ?? "")}
                >
                  <SelectTrigger className="w-full" disabled={!formProductId}>
                    <SelectValue placeholder={formProductId ? "Select category" : "Select a product first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesForFormProduct.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>System Permissions *</Label>
              <div className="grid grid-cols-2 gap-2 rounded-lg border bg-background p-2.5 sm:grid-cols-3">
                {CATEGORY_SCOPABLE_CAPABILITIES.map((cap) => (
                  <label key={cap} className="flex items-center gap-2 text-sm font-normal text-foreground cursor-pointer">
                    <Checkbox checked={formCapabilities.includes(cap)} onCheckedChange={() => toggleFormCapability(cap)} />
                    {capabilityLabel(cap)}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddAccess}>{editingMappingId ? "Save Changes" : "Add Access"}</Button>
              <Button size="sm" variant="outline" onClick={resetMappingForm}>Reset</Button>
            </div>
          </div>
        )}

        {/* Always every user's access — independent of the picker above. */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-64">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={mappingSearch}
                  onChange={(e) => {
                    setMappingSearch(e.target.value);
                    setMappingPage(1);
                  }}
                  placeholder="Search by user, product or category..."
                  className="h-9 pl-8 text-sm bg-background"
                />
              </div>
              <MultiSelect
                label="User"
                options={users.map((u) => ({ value: u.id, label: u.name }))}
                selected={mappingUserFilters}
                onChange={(selected) => {
                  setMappingUserFilters(selected);
                  setMappingPage(1);
                }}
                className="h-9 text-sm"
              />
              <MultiSelect
                label="Product"
                options={products.map((p) => ({ value: p.id, label: p.name }))}
                selected={mappingProductFilters}
                onChange={(selected) => {
                  setMappingProductFilters(selected);
                  setMappingPage(1);
                }}
                className="h-9 text-sm"
              />
              <MultiSelect
                label="Category"
                options={ruleCategories.map((c) => ({ value: c.id, label: c.name }))}
                selected={mappingCategoryFilters}
                onChange={(selected) => {
                  setMappingCategoryFilters(selected);
                  setMappingPage(1);
                }}
                className="h-9 text-sm"
              />
              {(mappingSearch !== "" || mappingUserFilters.length > 0 || mappingProductFilters.length > 0 || mappingCategoryFilters.length > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMappingSearch("");
                    setMappingUserFilters([]);
                    setMappingProductFilters([]);
                    setMappingCategoryFilters([]);
                    setMappingPage(1);
                  }}
                  className="h-9 text-sm text-muted-foreground hover:text-foreground"
                >
                  Reset filters
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{filteredMappings.length} of {allMappings.length}</span>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={exportMappingsCsv}>
                <Download className="size-3.5" /> Export
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleMappingSort("user")}>
                    User {sortIndicator("user")}
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleMappingSort("product")}>
                    Product {sortIndicator("product")}
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleMappingSort("category")}>
                    Category {sortIndicator("category")}
                  </TableHead>
                  <TableHead>System Permissions</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleMappingSort("createdAt")}>
                    Created Date {sortIndicator("createdAt")}
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedMappings.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{mappingUserName(m.userId)}</TableCell>
                    <TableCell>{productName(m.productId)}</TableCell>
                    <TableCell>{categoryName(m.categoryId)}</TableCell>
                    <TableCell>
                      <div className="flex max-w-56 flex-wrap gap-1">
                        {m.capabilities.map((cap) => (
                          <Badge key={cap} variant="secondary" className="text-sm font-mono">{capabilityLabel(cap)}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.createdBy}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(m.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("text-sm", m.status === "Active" && "border-emerald-500/30 text-emerald-600 dark:text-emerald-400")}
                      >
                        {m.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-0.5">
                        <Button variant="ghost" size="icon-sm" onClick={() => startEditMapping(m)} title="Edit access">
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="hover:text-destructive"
                          onClick={() => setPendingDeleteMapping(m)}
                          title="Delete access"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedMappings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                      {allMappings.length === 0
                        ? "No access assigned yet — select a user above to add one."
                        : "No access rows match your search."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {totalMappingPages > 1 && (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                variant="outline"
                size="icon-sm"
                disabled={safeMappingPage <= 1}
                onClick={() => setMappingPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <span className="px-1 text-sm text-muted-foreground">Page {safeMappingPage} of {totalMappingPages}</span>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={safeMappingPage >= totalMappingPages}
                onClick={() => setMappingPage((p) => Math.min(totalMappingPages, p + 1))}
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!pendingDeleteMapping} onOpenChange={(v) => !v && setPendingDeleteMapping(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this access?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteMapping &&
                `${mappingUserName(pendingDeleteMapping.userId)}'s ${pendingDeleteMapping.capabilities.length} permission(s) on "${productName(pendingDeleteMapping.productId)}" / "${categoryName(pendingDeleteMapping.categoryId)}" will be removed.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteMapping}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                <Select
                  items={jobTitleSelectItems}
                  value={draft.role}
                  onValueChange={(v) => applyJobTitle((v as string) ?? "")}
                >
                  <SelectTrigger className="w-full" disabled={jobTitles.length === 0}>
                    <SelectValue placeholder={jobTitles.length === 0 ? "No job titles configured yet" : "Select job title…"} />
                  </SelectTrigger>
                  <SelectContent>
                    {jobTitles.map((jt) => (
                      <SelectItem key={jt.id} value={jt.name}>{jt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {jobTitles.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Add a Job Title in Job Titles first — it&apos;ll show up here.
                  </p>
                )}
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
              <label className="col-span-2 flex cursor-pointer items-start gap-2.5 rounded-lg border bg-muted/20 p-3">
                <Checkbox
                  className="mt-0.5"
                  checked={draft.isAdmin}
                  onCheckedChange={(v) => setDraft((d) => ({ ...d, isAdmin: !!v }))}
                />
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium text-foreground">Administrator</span>
                  <span className="block text-sm text-muted-foreground">
                    Grants full Configuration Studio and system access (config, NotifyX, system settings). Day-to-day rule
                    access is set per product/category in User Access Mapping below.
                  </span>
                </span>
              </label>
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
              Their product/category access grants in User Access Mapping will also be removed.
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
