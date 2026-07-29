"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  ScrollText,
  Workflow,
  FileEdit,
  Grid3x3,
  GitBranch,
  LayoutTemplate,
  AlertTriangle,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { LogoMark } from "@/components/shell/logo";
import { RoleSwitcherDialog } from "@/components/shell/role-switcher-dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupButton } from "@/components/ui/input-group";

const LIFECYCLE_STAGES = ["Draft", "Testing", "Active", "Inactive", "Archived"];

const CAPABILITIES = [
  { icon: FileEdit, label: "No-Code Rule Builder", desc: "Compose IF/THEN logic visually, no syntax required." },
  { icon: Grid3x3, label: "Decision Matrix Configuration", desc: "Edit pricing and threshold slabs like a spreadsheet." },
  { icon: ShieldCheck, label: "Approval Workflow & Governance", desc: "Draft → Testing → Review → Publish, fully audited." },
  { icon: LayoutTemplate, label: "Rule Templates & Groups", desc: "Reusable starting shapes and organizational collections." },
  { icon: GitBranch, label: "Conflict Detection", desc: "Flags contradictory rules before they reach production." },
  { icon: ScrollText, label: "Full Audit Trail", desc: "Every configuration change is logged and traceable." },
];

const TRUST_BADGES = [
  { icon: ShieldCheck, label: "Secure Access" },
  { icon: KeyRound, label: "Role-Based Permissions" },
  { icon: ScrollText, label: "Full Audit Trail" },
  { icon: Workflow, label: "Workflow Automation" },
];

export default function LoginPage() {
  const router = useRouter();
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const login = useAppStore((s) => s.login);
  const rules = useAppStore((s) => s.rules);
  const simulations = useAppStore((s) => s.simulations);
  const appName = useAppStore((s) => s.appearance.appName);
  const tagline = useAppStore((s) => s.appearance.tagline);
  const dashboardConfigs = useAppStore((s) => s.dashboardConfigs);
  const currentUserId = useAppStore((s) => s.currentUser.userId);

  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      router.replace(dashboardConfigs[currentUserId]?.landingRoute ?? "/dashboard");
    }
  }, [hasHydrated, isAuthenticated, dashboardConfigs, currentUserId, router]);

  const totalRules = rules.length;
  const activeRules = rules.filter((r) => r.status === "Published").length;
  const simulationsRun = simulations.length + 256;

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId.trim() || !password.trim()) {
      setError("Enter both your Employee ID and password to continue.");
      return;
    }
    setError("");
    login();
    toast.success("Signed in successfully");
    router.push(dashboardConfigs[currentUserId]?.landingRoute ?? "/dashboard");
  };

  return (
    <div className="grid h-full grid-cols-1 overflow-y-auto md:grid-cols-2 md:overflow-hidden">
      {/* Compact brand banner — mobile only (<768px). Replaces the old
          logo-only fallback so the trust story survives on phones instead
          of vanishing entirely. */}
      <div className="flex flex-col gap-3 border-b bg-sidebar px-5 py-4 text-sidebar-foreground md:hidden">
        <div className="flex items-center gap-2.5">
          <LogoMark className="size-8" />
          <div>
            <p className="text-sm font-semibold tracking-tight">{appName}</p>
            <p className="text-sm text-sidebar-foreground/85">{tagline}</p>
          </div>
        </div>
        <div className="flex gap-4 text-sm text-sidebar-foreground/90">
          <span>
            <span className="font-semibold text-sidebar-primary">{totalRules}</span> Total Rules
          </span>
          <span>
            <span className="font-semibold text-sidebar-primary">{activeRules}</span> Active
          </span>
        </div>
      </div>

      {/* Left — branding panel. Full detail from desktop (lg, ≥1024px);
          a condensed logo + hero + stat-row subset from tablet (md,
          ≥768px) — the lifecycle stepper and capability grid step in only
          at lg so the panel degrades gracefully instead of disappearing. */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden px-6 py-6 text-sidebar-foreground md:flex md:px-8 md:py-8 lg:px-10 lg:py-10 xl:px-14"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklch, var(--sidebar) 88%, black 12%) 0%, var(--sidebar) 45%, color-mix(in oklch, var(--sidebar) 78%, var(--sidebar-primary) 22%) 100%)",
        }}
      >
        <div>
          <div className="flex items-center gap-3">
            <LogoMark className="size-10" />
            <div>
              <p className="text-lg font-semibold tracking-tight">{appName}</p>
              <p className="text-sm text-sidebar-foreground/85">{tagline}</p>
            </div>
          </div>

          <h1 className="mt-10 max-w-md text-xl font-semibold tracking-tight text-balance">
            One decision platform for every industry.
          </h1>
          <p className="mt-2 max-w-sm text-sm text-sidebar-foreground/85">
            Configure once, evaluate everywhere — no code required to add an industry, a rule, or a workflow.
          </p>

          <div className="mt-8 grid max-w-sm grid-cols-3 gap-3">
            <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3 text-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_10px_24px_-8px_rgba(0,0,0,0.65)]">
              <p className="text-xl font-semibold text-sidebar-primary">{totalRules}</p>
              <p className="text-sm text-sidebar-foreground/80">Total Rules</p>
            </div>
            <div className="rounded-xl border border-sidebar-primary/40 bg-sidebar-primary/10 p-3 text-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_10px_24px_-6px_rgba(0,0,0,0.65)]">
              <p className="text-xl font-semibold text-sidebar-primary">{activeRules}</p>
              <p className="text-sm text-sidebar-foreground/90">Active Rules</p>
            </div>
            <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3 text-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_10px_24px_-8px_rgba(0,0,0,0.65)]">
              <p className="text-xl font-semibold text-sidebar-primary">{simulationsRun}</p>
              <p className="text-sm text-sidebar-foreground/80">Simulations</p>
            </div>
          </div>

          <div className="mt-8 hidden max-w-sm lg:block">
            <p className="mb-2.5 text-sm font-semibold uppercase tracking-wider text-sidebar-foreground/70">
              Rule Lifecycle
            </p>
            <div className="flex items-center">
              {LIFECYCLE_STAGES.map((stage, i) => (
                <div key={stage} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <span
                      className={`flex size-6 items-center justify-center rounded-full text-sm font-semibold ${
                        i === 2
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "bg-sidebar-accent text-sidebar-foreground/85"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm text-sidebar-foreground/80">{stage}</span>
                  </div>
                  {i < LIFECYCLE_STAGES.length - 1 && <div className="mx-1 h-px flex-1 bg-sidebar-border" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="hidden max-w-xl gap-x-4 gap-y-2.5 lg:grid lg:grid-cols-[repeat(auto-fit,minmax(15.5rem,1fr))]">
          {CAPABILITIES.map((cap) => (
            <div key={cap.label} className="flex items-center gap-2">
              <cap.icon className="size-3.5 shrink-0 text-sidebar-primary" />
              <p className="text-sm whitespace-nowrap text-sidebar-foreground/90">{cap.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right — sign-in card. Bounded, elevated container (the established
          rounded-xl/border/bg-card pattern used elsewhere in the app) so
          the credential form reads as the page's secure surface, with a
          single visually dominant CTA. */}
      <div
        className="flex flex-col items-center justify-center px-6 py-10 sm:px-10 md:py-12"
        style={{
          background:
            "radial-gradient(800px 600px at 100% 0%, rgb(192 207 243) 0%, transparent 60%), radial-gradient(600px 500px at 0% 100%, rgb(165 164 162) 0%, transparent 60%), rgb(241 231 231)",
        }}
      >
        <div className="w-full max-w-[30rem]">
          <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-bold tracking-tight text-[#0a1230]">Welcome Back</h2>
            <p className="mt-1 text-sm text-[#0a1230]/70">Sign in to your {appName} account</p>

            <form className="mt-6 space-y-4" onSubmit={handleSignIn}>
              <div className="space-y-1.5">
                <Label htmlFor="employeeId" className="font-bold text-[#0a1230]">Employee ID</Label>
                <InputGroup className="h-[42px] border-[#c7cfe3] bg-transparent">
                  <InputGroupAddon>
                    <User className="size-4 text-[#0a1230]/80" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="employeeId"
                    placeholder="EMP-0001"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    autoComplete="username"
                    autoFocus
                    className="login-input"
                  />
                </InputGroup>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="font-bold text-[#0a1230]">Password</Label>
                <InputGroup className="h-[42px] border-[#c7cfe3] bg-transparent">
                  <InputGroupAddon>
                    <Lock className="size-4 text-[#0a1230]/80" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="login-input"
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((s) => !s)}
                    >
                      {showPassword ? <EyeOff className="size-4 text-[#0a1230]/80" /> : <Eye className="size-4 text-[#0a1230]/80" />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </div>

              {error && (
                <p role="alert" aria-live="polite" className="flex items-center gap-1.5 text-sm text-destructive">
                  <AlertTriangle className="size-3.5 shrink-0" /> {error}
                </p>
              )}

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-[#0a1230]">
                  <Checkbox checked={rememberMe} onCheckedChange={(v) => setRememberMe(!!v)} />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => toast.info("Contact your administrator to reset your password.")}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <Button type="submit" size="lg" className="w-full font-semibold shadow-sm">
                Sign In
              </Button>
            </form>

            <div className="mt-5 text-center text-sm text-[#0a1230]/70">
              Need Demo Access?{" "}
              <button
                onClick={() => setPickerOpen(true)}
                className="font-medium text-[#0a1230] underline-offset-2 hover:underline"
              >
                Enter Demo Mode
              </button>
            </div>

            <div className="mt-6 grid gap-x-3 gap-y-2.5 border-t pt-5 [grid-template-columns:repeat(auto-fit,minmax(11.5rem,1fr))]">
              {TRUST_BADGES.map((badge) => (
                <div key={badge.label} className="flex items-center gap-1.5 text-sm whitespace-nowrap text-[#0a1230]/80">
                  <badge.icon className="size-3.5 shrink-0 text-primary/70" />
                  {badge.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <RoleSwitcherDialog open={pickerOpen} onOpenChange={setPickerOpen} redirectTo="/dashboard" />
    </div>
  );
}
