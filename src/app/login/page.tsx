"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { User, Lock, Eye, EyeOff, ShieldCheck, KeyRound, ScrollText, Workflow, AlertTriangle } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { LogoMark } from "@/components/shell/logo";
import { NetworkBackground } from "@/components/login/network-background";
import { SparkleAccent } from "@/components/login/sparkle-accent";
import { ProductMockup } from "@/components/login/product-mockup";
import { FeatureBadge } from "@/components/login/feature-badge";
import { RoleSwitcherDialog } from "@/components/shell/role-switcher-dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupButton } from "@/components/ui/input-group";

const CAPABILITIES = [
  "No-Code Rule Builder",
  "Decision Matrix Configuration",
  "Approval Workflow & Governance",
  "Conflict Detection",
  "Full Audit Trail",
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
  const sampleRules = rules.filter((r) => r.simulatable).slice(0, 3).map((r) => ({ id: r.id, name: r.name, status: r.status }));

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
    <div
      className="relative flex h-full flex-col overflow-y-auto md:flex-row md:overflow-hidden"
      style={
        {
          // The sign-in hero is a fixed brand visual (navy → teal, matching
          // the constellation backdrop below) — deliberately independent of
          // the authenticated app's Appearance Studio theme/color-mode, the
          // same way most products give their login screen its own fixed
          // look. Scoping these as local --sidebar-* overrides (rather than
          // touching every text-sidebar-foreground/bg-sidebar-accent/etc.
          // class already used throughout this page) means the existing
          // markup below picks up the fixed palette for free. Applied on the
          // full-width root (not just a half-width column) so the gradient
          // spans the whole screen, with the sign-in card floating on top of
          // it near the right edge — matches the shared reference layout.
          "--sidebar": "#0f2744",
          "--sidebar-foreground": "#f3f8fb",
          "--sidebar-primary": "#5eead4",
          "--sidebar-primary-foreground": "#082433",
          "--sidebar-accent": "#173a5a",
          "--sidebar-accent-foreground": "#f3f8fb",
          "--sidebar-border": "rgba(243, 248, 251, 0.14)",
          background:
            "linear-gradient(135deg, color-mix(in oklch, var(--sidebar) 88%, black 12%) 0%, var(--sidebar) 45%, color-mix(in oklch, var(--sidebar) 78%, var(--sidebar-primary) 22%) 100%)",
        } as React.CSSProperties
      }
    >
      {/* Compact brand banner — mobile only (<768px). Replaces the old
          logo-only fallback so the trust story survives on phones instead
          of vanishing entirely. */}
      <div className="flex flex-col gap-3 border-b border-sidebar-border px-5 py-4 text-sidebar-foreground md:hidden">
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

      {/* Left/center — branding content, floating on the full-width gradient.
          Full detail from desktop (lg, ≥1024px); a condensed logo + hero
          subset from tablet (md, ≥768px) — the mockup/badges step in only at
          lg so the panel degrades gracefully instead of disappearing. */}
      <div className="relative hidden min-w-0 flex-1 flex-col justify-between overflow-hidden px-6 py-6 text-sidebar-foreground md:flex md:px-8 md:py-8 lg:px-10 lg:py-10 xl:px-14">
        <NetworkBackground className="pointer-events-none absolute inset-0 h-full w-full" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <LogoMark className="size-10" />
            <div>
              <p className="text-lg font-semibold tracking-tight">{appName}</p>
              <p className="text-sm text-sidebar-foreground/85">{tagline}</p>
            </div>
            <SparkleAccent className="ml-1 size-7 lg:size-9" />
          </div>

          <h1 className="mt-8 max-w-md text-3xl leading-tight font-bold tracking-tight text-balance lg:text-4xl">
            <span className="text-sidebar-foreground">One decision platform</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sidebar-primary to-cyan-300 animate-pulse drop-shadow-[0_0_10px_rgba(94,234,212,0.6)]">for every industry.</span>
          </h1>
          <p className="mt-3 max-w-sm text-sm text-sidebar-foreground/80">
            Configure once, evaluate everywhere — no code required to add an industry, a rule, or a workflow.
          </p>
        </div>

        <div className="flex flex-1 items-center justify-center py-8">
          <div className="relative">
            {/* Active Data Nodes (Structured Decision Pipeline) */}
            <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox="0 0 800 600" aria-hidden="true" style={{ overflow: 'visible' }}>
              <defs>
                <linearGradient id="pipelineGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--sidebar-primary)" stopOpacity="0" />
                  <stop offset="50%" stopColor="var(--sidebar-primary)" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="var(--sidebar-primary)" stopOpacity="0" />
                </linearGradient>
                <filter id="nodeGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Central Processor Ring (Behind Card) */}
              <circle cx="400" cy="300" r="160" fill="none" stroke="var(--sidebar-primary)" strokeWidth="1" strokeOpacity="0.2" style={{ animation: 'spinSlow 20s linear infinite' }} strokeDasharray="10 20" />
              <circle cx="400" cy="300" r="220" fill="none" stroke="var(--sidebar-primary)" strokeWidth="1" strokeOpacity="0.1" style={{ animation: 'spinSlow 30s linear infinite reverse' }} strokeDasharray="4 40" />

              <g filter="url(#nodeGlow)">
                {/* Data Track 1 (Top Left Input) */}
                <g opacity="0.6">
                  <path d="M -100 100 L 200 100 L 200 250 L 400 250" fill="none" stroke="var(--sidebar-primary)" strokeWidth="1.5" strokeOpacity="0.4" />
                  <circle cx="200" cy="100" r="4" fill="var(--sidebar-primary)" />
                  <circle cx="200" cy="250" r="3" fill="var(--sidebar-primary)" />
                  <rect x="-10" y="-2" width="20" height="4" fill="#fff" rx="2">
                    <animateMotion dur="4s" repeatCount="indefinite" path="M -100 100 L 200 100 L 200 250 L 400 250" />
                    <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="4s" repeatCount="indefinite" />
                  </rect>
                </g>

                {/* Data Track 2 (Bottom Left Input) */}
                <g opacity="0.6">
                  <path d="M -100 500 L 300 500 L 300 350 L 400 350" fill="none" stroke="var(--sidebar-primary)" strokeWidth="1.5" strokeOpacity="0.4" />
                  <circle cx="300" cy="500" r="4" fill="var(--sidebar-primary)" />
                  <circle cx="300" cy="350" r="3" fill="var(--sidebar-primary)" />
                  <rect x="-10" y="-2" width="20" height="4" fill="#fff" rx="2">
                    <animateMotion dur="5s" repeatCount="indefinite" path="M -100 500 L 300 500 L 300 350 L 400 350" />
                    <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="5s" repeatCount="indefinite" />
                  </rect>
                </g>

                {/* Data Track 3 (Top Right Output) */}
                <g opacity="0.6">
                  <path d="M 400 200 L 600 200 L 600 50 L 900 50" fill="none" stroke="var(--sidebar-primary)" strokeWidth="1.5" strokeOpacity="0.4" />
                  <circle cx="600" cy="200" r="4" fill="var(--sidebar-primary)" />
                  <circle cx="600" cy="50" r="3" fill="var(--sidebar-primary)" />
                  <rect x="-10" y="-2" width="20" height="4" fill="#fff" rx="2">
                    <animateMotion dur="4.5s" repeatCount="indefinite" path="M 400 200 L 600 200 L 600 50 L 900 50" />
                    <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="4.5s" repeatCount="indefinite" />
                  </rect>
                </g>

                {/* Data Track 4 (Bottom Right Output) */}
                <g opacity="0.6">
                  <path d="M 400 400 L 500 400 L 500 550 L 900 550" fill="none" stroke="var(--sidebar-primary)" strokeWidth="1.5" strokeOpacity="0.4" />
                  <circle cx="500" cy="400" r="4" fill="var(--sidebar-primary)" />
                  <circle cx="500" cy="550" r="3" fill="var(--sidebar-primary)" />
                  <rect x="-10" y="-2" width="20" height="4" fill="#fff" rx="2">
                    <animateMotion dur="3.5s" repeatCount="indefinite" path="M 400 400 L 500 400 L 500 550 L 900 550" />
                    <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="3.5s" repeatCount="indefinite" />
                  </rect>
                </g>

                {/* Direct Feed Track (Straight Left) */}
                <g opacity="0.8">
                  <path d="M -100 300 L 400 300" fill="none" stroke="var(--sidebar-primary)" strokeWidth="2" strokeOpacity="0.6" strokeDasharray="8 8" style={{ animation: 'march 2s linear infinite reverse' }} />
                  <circle cx="150" cy="300" r="5" fill="var(--sidebar-primary)" />
                </g>
              </g>

              <style>{`
                @keyframes spinSlow {
                  0% { transform: rotate(0deg); transform-origin: 400px 300px; }
                  100% { transform: rotate(360deg); transform-origin: 400px 300px; }
                }
                @keyframes march {
                  0% { stroke-dashoffset: 0; }
                  100% { stroke-dashoffset: 16; }
                }
              `}</style>
            </svg>
            <ProductMockup totalRules={totalRules} activeRules={activeRules} simulationsRun={simulationsRun} sampleRules={sampleRules} />
            <FeatureBadge label={CAPABILITIES[0]} className="absolute right-[100%] top-10 mr-6 hidden lg:flex whitespace-nowrap" style={{ animation: 'ucrmLoginBadgeBob 5.8s ease-in-out infinite' }} />
            <FeatureBadge label={CAPABILITIES[1]} className="absolute left-[100%] top-1/4 ml-6 hidden lg:flex whitespace-nowrap" style={{ animation: 'ucrmLoginBadgeBob 6.2s ease-in-out infinite 0.5s' }} />
            <FeatureBadge label={CAPABILITIES[2]} className="absolute left-[100%] bottom-[18px] ml-5 hidden lg:flex whitespace-nowrap" style={{ animation: 'ucrmLoginBadgeBob 5.5s ease-in-out infinite 1s' }} />
            <FeatureBadge label={CAPABILITIES[3]} className="absolute right-[100%] bottom-20 mr-10 hidden lg:flex whitespace-nowrap" style={{ animation: 'ucrmLoginBadgeBob 6.0s ease-in-out infinite 1.5s' }} />
            <FeatureBadge label={CAPABILITIES[4]} className="absolute top-[100%] left-10 mt-6 hidden lg:flex whitespace-nowrap" style={{ animation: 'ucrmLoginBadgeBob 5.7s ease-in-out infinite 0.2s' }} />
          </div>
        </div>
      </div>

      {/* Right — sign-in card. Bounded, elevated container (the established
          rounded-xl/border/bg-card pattern used elsewhere in the app) so
          the credential form reads as the page's secure surface, with a
          single visually dominant CTA. */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-10 sm:px-10 md:flex-none md:justify-center md:px-10 md:py-12 lg:pr-10 xl:pr-12">
        <div className="w-full max-w-[30rem]">
          <div className="rounded-3xl border border-white/40 bg-white/95 backdrop-blur-2xl p-6 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] sm:p-8">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4 flex h-14 w-full items-center justify-center overflow-hidden mix-blend-multiply">
                <img src="/custom-logo.png" alt="Logo" className="h-32 max-w-[220px] object-contain" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-[#0a1230]">Welcome Back</h2>
              <p className="mt-1 text-sm text-[#0a1230]/70">Sign in to your {appName} account</p>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSignIn}>
              <div className="space-y-1.5">
                <Label htmlFor="employeeId" className="font-bold text-[#0a1230]">Employee ID</Label>
                <InputGroup className="h-[42px] border-[#c7cfe3] bg-white/50 backdrop-blur-sm transition-all focus-within:border-[#0056b3] focus-within:ring-2 focus-within:ring-[#0056b3]/20">
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
                <InputGroup className="h-[42px] border-[#c7cfe3] bg-white/50 backdrop-blur-sm transition-all focus-within:border-[#0056b3] focus-within:ring-2 focus-within:ring-[#0056b3]/20">
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

              <Button type="submit" size="lg" className="w-full h-12 font-semibold shadow-sm bg-[#0056b3] text-white hover:bg-[#004494] hover:shadow-[0_0_15px_rgba(0,86,179,0.5)] active:scale-[0.98] transition-all border-0">
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


          </div>
        </div>
      </div>

      <RoleSwitcherDialog open={pickerOpen} onOpenChange={setPickerOpen} redirectTo="/dashboard" />
    </div>
  );
}
