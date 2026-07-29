"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ShieldCheck } from "lucide-react";
import { useAppStore } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function RoleSwitcherDialog({
  open,
  onOpenChange,
  redirectTo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Navigate here after a user is picked — used when this dialog doubles as the sign-in shortcut on /login. */
  redirectTo?: string;
}) {
  const router = useRouter();
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.currentUser);
  const loginAsUser = useAppStore((s) => s.loginAsUser);
  const dashboardConfigs = useAppStore((s) => s.dashboardConfigs);

  const selectUser = (userId: string, name: string) => {
    loginAsUser(userId);
    onOpenChange(false);
    toast.success(`Signed in as ${name}`);
    // Every switch lands on that user's configured primary module.
    router.push(dashboardConfigs[userId]?.landingRoute ?? redirectTo ?? "/dashboard");
  };

  const initialsOf = (name: string) =>
    name.split(/[\s/]+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Select a User</DialogTitle>
          <DialogDescription>Choose a user to sign in as and explore the platform.</DialogDescription>
        </DialogHeader>
        <div className="grid max-h-100 grid-cols-1 gap-2.5 overflow-y-auto sm:grid-cols-2">
          {users.map((user) => {
            const active = user.id === currentUser.userId;
            return (
              <button
                key={user.id}
                onClick={() => selectUser(user.id, user.name)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border bg-card p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/40",
                  active && "border-primary bg-primary/5"
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                  {initialsOf(user.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{user.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{user.role}</p>
                </div>
                {user.isAdmin && !active && (
                  <span title="Administrator" className="shrink-0 text-amber-500">
                    <ShieldCheck className="size-4" />
                  </span>
                )}
                {active && <Check className="size-4 shrink-0 text-primary" />}
              </button>
            );
          })}
          {users.length === 0 && (
            <p className="col-span-full rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No users configured yet.
            </p>
          )}
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Role-based access is enforced client-side in this preview environment.
        </p>
      </DialogContent>
    </Dialog>
  );
}
