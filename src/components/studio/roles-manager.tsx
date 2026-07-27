"use client";

import { useMemo, useState } from "react";
import { Search, ShieldCheck, RotateCcw } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Role } from "@/lib/types";
import { iconForRole } from "@/lib/role-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

// Role definitions themselves are read-only here by design — see
// ProductAccessConfig in types.ts. Creating/editing/deleting a Role happens
// nowhere in this build (there is no other UI for it); this page only
// configures which Products each existing role can see.
export function RolesManager() {
  const roles = useAppStore((s) => s.roles);
  const products = useAppStore((s) => s.products);
  const productAccessConfigs = useAppStore((s) => s.productAccessConfigs);
  const setProductAccessConfig = useAppStore((s) => s.setProductAccessConfig);
  const clearProductAccessConfig = useAppStore((s) => s.clearProductAccessConfig);
  const [search, setSearch] = useState("");

  const filteredRoles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(
      (r) => r.name.toLowerCase().includes(q) || r.personaName.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)
    );
  }, [roles, search]);

  // Absent config = default-allow-all — every product is checked until an
  // admin explicitly restricts this role.
  const accessFor = (roleId: string) => productAccessConfigs[roleId];
  const isAllowed = (roleId: string, productId: string) => {
    const access = accessFor(roleId);
    return !access || access.productIds.includes(productId);
  };
  const toggleProduct = (role: Role, productId: string) => {
    const access = accessFor(role.id);
    const currentIds = access ? access.productIds : products.map((p) => p.id);
    const next = currentIds.includes(productId) ? currentIds.filter((id) => id !== productId) : [...currentIds, productId];
    setProductAccessConfig(role.id, next);
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
              placeholder="Search roles or personas..."
              className="h-9 pl-8 text-sm"
            />
          </div>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm font-medium text-muted-foreground">
            {filteredRoles.length} Roles
          </span>
        </div>
      </div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredRoles.map((role) => {
          const Icon = iconForRole(role.icon);
          const access = accessFor(role.id);
          const allowedCount = access ? access.productIds.length : products.length;

          return (
            <div
              key={role.id}
              className="flex flex-col justify-between rounded-xl border bg-card p-3.5 transition-colors hover:border-primary/30 hover:bg-accent/10"
            >
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-2xs">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold tracking-tight text-foreground">{role.personaName}</p>
                    <p className="truncate text-sm font-medium text-muted-foreground">{role.name}</p>
                  </div>
                </div>
              </div>

              <div className="mt-3.5 space-y-2 border-t pt-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-sm font-medium text-muted-foreground">
                    {allowedCount} of {products.length} products
                  </span>
                  {access && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 px-1.5 text-sm text-muted-foreground hover:text-foreground"
                      onClick={() => clearProductAccessConfig(role.id)}
                      title="Reset to all products, including any added later"
                    >
                      <RotateCcw className="size-3" /> Reset
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {products.map((p) => (
                    <label
                      key={p.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm text-foreground transition-colors hover:border-border/60 hover:bg-muted/50"
                    >
                      <Checkbox checked={isAllowed(role.id, p.id)} onCheckedChange={() => toggleProduct(role, p.id)} />
                      <span className="truncate">{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
        {filteredRoles.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
            <ShieldCheck className="size-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium text-foreground">No roles found</p>
            <p className="mt-0.5 text-sm text-muted-foreground">No roles match your search filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
