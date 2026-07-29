"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Monitor,
  Moon,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingDown,
  TrendingUp,
  Upload,
  Workflow,
  X,
} from "lucide-react";
import { useAppStore, useHasCapability, DEFAULT_APPEARANCE } from "@/lib/store";
import { applyAppearance } from "@/components/providers";
import { THEME_PRESETS } from "@/lib/theme-presets";
import { useTranslateFor } from "@/lib/use-translate";
import type { LanguageCode } from "@/lib/i18n";
import type {
  AppearanceSettings,
  BackgroundDisplayMode,
  BackgroundTarget,
  ColorMode,
  CustomColors,
  DensityMode,
  FontScale,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function sliderValue(v: number | readonly number[]): number {
  return Array.isArray(v) ? v[0] : (v as number);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const COLOR_MODES: { id: ColorMode; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

const CUSTOM_COLOR_ROWS: { key: keyof CustomColors; label: string }[] = [
  { key: "primary", label: "Primary / Buttons" },
  { key: "sidebarBg", label: "Sidebar Background" },
  { key: "sidebarFg", label: "Sidebar Text" },
  { key: "sidebarActive", label: "Sidebar Active" },
  { key: "chartAccent", label: "Chart Accent" },
];

const BG_TARGETS: BackgroundTarget[] = ["app", "dashboard", "sidebar"];
const BG_DISPLAY_MODES: BackgroundDisplayMode[] = ["cover", "contain", "fixed", "blur"];
const DENSITY_MODES: DensityMode[] = ["compact", "comfortable", "spacious"];
const FONT_SCALES: FontScale[] = ["sm", "md", "lg"];

const LANGUAGES: { code: string; native: string; english: string }[] = [
  { code: "en", native: "English", english: "English" },
  { code: "hi", native: "हिन्दी", english: "Hindi" },
  { code: "ta", native: "தமிழ்", english: "Tamil" },
  { code: "te", native: "తెలుగు", english: "Telugu" },
  { code: "ml", native: "മലയാളം", english: "Malayalam" },
  { code: "fr", native: "Français", english: "French" },
  { code: "es", native: "Español", english: "Spanish" },
  { code: "de", native: "Deutsch", english: "German" },
  { code: "ja", native: "日本語", english: "Japanese" },
  { code: "zh", native: "中文", english: "Chinese" },
  { code: "ar", native: "العربية", english: "Arabic" },
];

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  render,
}: {
  value: T;
  options: T[];
  onChange: (v: T) => void;
  render?: (opt: T) => React.ReactNode;
}) {
  return (
    <div className="flex overflow-hidden rounded-lg border text-sm">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 py-2 font-medium capitalize transition-colors",
            value === opt ? "bg-primary text-primary-foreground" : "hover:bg-accent"
          )}
        >
          {render ? render(opt) : opt}
        </button>
      ))}
    </div>
  );
}

function SliderRow({
  label,
  unit,
  value,
  max,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        <span>
          {value}
          {unit}
        </span>
      </div>
      <Slider value={[value]} max={max} step={1} onValueChange={(v) => onChange(sliderValue(v))} />
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

interface AppearanceStudioProps {
  onClose?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AppearanceStudio({ onClose, onOpenChange }: AppearanceStudioProps = {}) {
  const router = useRouter();
  const stored = useAppStore((s) => s.appearance);
  const setAppearance = useAppStore((s) => s.setAppearance);
  const canManageBranding = useHasCapability("config.manage");
  const [draft, setDraft] = useState<AppearanceSettings>(stored);
  const [activeTab, setActiveTab] = useState("theme");
  const [previewTab, setPreviewTab] = useState<"dashboard" | "signin">("dashboard");
  const bgInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslateFor(draft.language as LanguageCode);

  if (activeTab === "branding" && !canManageBranding) {
    setActiveTab("theme");
  }

  useEffect(() => {
    applyAppearance(draft);
  }, [draft]);

  const patch = (p: Partial<AppearanceSettings>) => setDraft((d) => ({ ...d, ...p }));

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (onOpenChange) {
      onOpenChange(false);
    } else {
      router.push("/dashboard");
    }
  };

  const cancel = () => {
    applyAppearance(stored);
    handleClose();
  };
  const commit = () => {
    setAppearance(draft);
    toast.success("Appearance updated", { description: "Applied across the workspace." });
    handleClose();
  };
  const reset = () => setDraft(DEFAULT_APPEARANCE);

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background text-foreground">
      {/* Header */}
      <div className="flex shrink-0 flex-wrap items-center gap-2.5 border-b bg-card/60 px-4 py-3 sm:px-6">
        <Button variant="ghost" size="icon-sm" onClick={cancel} aria-label="Back">
          <ArrowLeft className="size-4" />
        </Button>
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="size-4" />
        </span>
        <p className="text-sm font-semibold tracking-tight">{t("appearance.title")}</p>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <span className="size-1.5 rounded-full bg-emerald-500" /> {t("appearance.livePreviewBadge")}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5">
            <RotateCcw className="size-3.5" /> Reset
          </Button>
          <Button variant="outline" size="sm" onClick={cancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={commit} className="gap-1.5">
            <Check className="size-3.5" /> Apply Changes
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as string)} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row overflow-hidden">
          <div className="w-full shrink-0 overflow-y-auto border-r p-4 sm:p-5 lg:w-96 flex flex-col gap-4">
            <TabsList className="w-full shrink-0">
              <TabsTrigger value="theme" className="flex-1">{t("appearance.tabTheme")}</TabsTrigger>
              <TabsTrigger value="colors" className="flex-1">{t("appearance.tabColors")}</TabsTrigger>
              <TabsTrigger value="bg" className="flex-1">{t("appearance.tabBg")}</TabsTrigger>
              <TabsTrigger value="display" className="flex-1">{t("appearance.tabDisplay")}</TabsTrigger>
              {canManageBranding && <TabsTrigger value="branding" className="flex-1">{t("appearance.tabBranding")}</TabsTrigger>}
            </TabsList>

            <div className="flex-1 space-y-5">
                <TabsContent value="theme" className="space-y-5">
                  <section>
                    <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Color Mode
                    </p>
                    <SegmentedControl
                      value={draft.colorMode}
                      options={COLOR_MODES.map((m) => m.id)}
                      onChange={(v) => patch({ colorMode: v })}
                      render={(v) => {
                        const m = COLOR_MODES.find((x) => x.id === v)!;
                        return (
                          <>
                            <m.icon className="size-3.5" /> {m.label}
                          </>
                        );
                      }}
                    />
                  </section>

                  <section>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Themes</p>
                      <span className="text-sm text-muted-foreground">{THEME_PRESETS.length} themes</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {THEME_PRESETS.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => patch({ preset: t.id })}
                          className={cn(
                            "flex flex-col items-start gap-1.5 rounded-xl border p-2.5 text-left transition-all",
                            draft.preset === t.id ? "border-primary ring-2 ring-primary/20" : "hover:border-foreground/20"
                          )}
                        >
                          <div className="flex w-full items-center justify-between">
                            <span className="size-4 rounded-full border shadow-sm" style={{ backgroundColor: t.swatch }} />
                            {draft.preset === t.id && <Check className="size-3.5 text-primary" />}
                          </div>
                          <p className="text-sm font-semibold leading-tight">{t.name}</p>
                        </button>
                      ))}
                    </div>
                  </section>
                </TabsContent>

                <TabsContent value="colors" className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Override individual colors on top of the selected theme. Clear a swatch to inherit from the theme again.
                  </p>
                  {CUSTOM_COLOR_ROWS.map((row) => (
                    <div key={row.key} className="flex items-center justify-between gap-3 rounded-lg border p-2.5">
                      <Label className="text-sm">{row.label}</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={draft.customColors[row.key] ?? "#64748b"}
                          onChange={(e) =>
                            patch({ customColors: { ...draft.customColors, [row.key]: e.target.value } })
                          }
                          className="size-7 cursor-pointer rounded border p-0.5"
                        />
                        {draft.customColors[row.key] && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              const next = { ...draft.customColors };
                              delete next[row.key];
                              patch({ customColors: next });
                            }}
                          >
                            <X className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="bg" className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => bgInputRef.current?.click()}>
                      <Upload className="size-3.5" /> Upload Image
                    </Button>
                    {draft.background.imageData && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => patch({ background: { ...draft.background, imageData: null } })}
                      >
                        Remove
                      </Button>
                    )}
                    <input
                      ref={bgInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const dataUrl = await readFileAsDataUrl(file);
                        patch({ background: { ...draft.background, imageData: dataUrl } });
                      }}
                    />
                  </div>

                  {draft.background.imageData && (
                    <div className="space-y-4 rounded-lg border p-3">
                      <div>
                        <p className="mb-1.5 text-sm font-medium text-muted-foreground">Apply To</p>
                        <SegmentedControl
                          value={draft.background.target}
                          options={BG_TARGETS}
                          onChange={(v) => patch({ background: { ...draft.background, target: v } })}
                        />
                      </div>
                      <div>
                        <p className="mb-1.5 text-sm font-medium text-muted-foreground">Display Mode</p>
                        <SegmentedControl
                          value={draft.background.displayMode}
                          options={BG_DISPLAY_MODES}
                          onChange={(v) => patch({ background: { ...draft.background, displayMode: v } })}
                        />
                      </div>
                      <SliderRow
                        label="Opacity"
                        unit="%"
                        value={draft.background.opacity}
                        max={100}
                        onChange={(v) => patch({ background: { ...draft.background, opacity: v } })}
                      />
                      {draft.background.displayMode !== "blur" && (
                        <SliderRow
                          label="Blur"
                          unit="px"
                          value={draft.background.blur}
                          max={24}
                          onChange={(v) => patch({ background: { ...draft.background, blur: v } })}
                        />
                      )}
                      <SliderRow
                        label="Brightness"
                        unit="%"
                        value={draft.background.brightness}
                        max={150}
                        onChange={(v) => patch({ background: { ...draft.background, brightness: v } })}
                      />
                      <SliderRow
                        label="Dim Overlay"
                        unit="%"
                        value={draft.background.dimOverlay}
                        max={100}
                        onChange={(v) => patch({ background: { ...draft.background, dimOverlay: v } })}
                      />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="display" className="space-y-5">
                  <section>
                    <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Language</p>
                    <div className="grid grid-cols-3 gap-2">
                      {LANGUAGES.map((l) => (
                        <button
                          key={l.code}
                          type="button"
                          onClick={() => patch({ language: l.code })}
                          className={cn(
                            "flex flex-col items-start gap-0.5 rounded-lg border px-2.5 py-2 text-left transition-colors",
                            draft.language === l.code ? "border-primary bg-primary/5" : "hover:border-foreground/20"
                          )}
                        >
                          <span className="flex w-full items-center justify-between text-sm font-medium">
                            {l.native}
                            {draft.language === l.code && <Check className="size-3 text-primary" />}
                          </span>
                          <span className="text-sm text-muted-foreground">{l.english}</span>
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground/70">
                      Sets the page locale (&lt;html lang&gt;) for assistive tech and locale-aware formatting, and
                      translates the sidebar, header, Dashboard, and this Appearance Studio. Coverage across the
                      rest of the app is rolling out incrementally.
                    </p>
                  </section>
                  <section>
                    <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Density</p>
                    <SegmentedControl
                      value={draft.density}
                      options={DENSITY_MODES}
                      onChange={(v) => patch({ density: v })}
                    />
                  </section>
                  <section>
                    <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Font Scale
                    </p>
                    <SegmentedControl
                      value={draft.fontScale}
                      options={FONT_SCALES}
                      onChange={(v) => patch({ fontScale: v })}
                      render={(v) => <span className="uppercase">{v}</span>}
                    />
                  </section>
                  <section className="space-y-2.5">
                    <ToggleRow
                      label="High Contrast"
                      desc="Stronger borders & focus rings for low-vision users."
                      checked={draft.highContrast}
                      onChange={(v) => patch({ highContrast: v })}
                    />
                    <ToggleRow
                      label="Large Click Targets"
                      desc="Minimum 44×44px touch targets on buttons & menu items."
                      checked={draft.largeClickTargets}
                      onChange={(v) => patch({ largeClickTargets: v })}
                    />
                    <ToggleRow
                      label="Smart Insights"
                      desc="Show the AI insight banner on the Dashboard."
                      checked={draft.showInsights}
                      onChange={(v) => patch({ showInsights: v })}
                    />
                  </section>
                </TabsContent>

                {canManageBranding && (
                  <TabsContent value="branding" className="space-y-4">
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <ShieldCheck className="size-3 shrink-0" /> Organization-wide — applies for every user, not just you.
                    </p>
                    <section className="space-y-1.5">
                      <Label className="text-sm">Organization / App Name</Label>
                      <input
                        type="text"
                        value={draft.appName}
                        onChange={(e) => patch({ appName: e.target.value })}
                        className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                        placeholder="e.g. Business Rules Engine"
                      />
                    </section>
                    <section className="space-y-1.5">
                      <Label className="text-sm">Tagline</Label>
                      <input
                        type="text"
                        value={draft.tagline}
                        onChange={(e) => patch({ tagline: e.target.value })}
                        className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                        placeholder="e.g. Decision Platform"
                      />
                    </section>
                    <section className="space-y-1.5">
                      <Label className="text-sm">Logo</Label>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => logoInputRef.current?.click()}>
                          <Upload className="size-3.5" /> Upload Logo
                        </Button>
                        {draft.logo && (
                          <Button variant="ghost" size="sm" onClick={() => patch({ logo: null })}>
                            Remove
                          </Button>
                        )}
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const dataUrl = await readFileAsDataUrl(file);
                            patch({ logo: dataUrl });
                          }}
                        />
                      </div>
                      {draft.logo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={draft.logo} alt="Logo preview" className="size-12 rounded-lg border object-contain p-1" />
                      )}
                      <p className="text-sm text-muted-foreground">
                        Replaces the default brand mark in the sidebar, header, and login screen.
                      </p>
                    </section>
                  </TabsContent>
                )}
              </div>
            </div>

              {/* Live preview mockup — reads the same CSS variables applyAppearance
                  just set on <html>, so it re-themes in step with the real app. */}
              <div className="flex-1 overflow-y-auto bg-muted/20 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t("appearance.livePreviewHeading")}</p>
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-emerald-500" /> {t("appearance.changesApplyInstantly")}
                  </span>
                </div>

                {/* Preview Tabs */}
                <div className="mb-3 flex gap-2 border-b">
                  <button
                    onClick={() => setPreviewTab("dashboard")}
                    className={cn(
                      "px-3 py-2 text-sm font-medium border-b-2 transition-colors",
                      previewTab === "dashboard"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t("appearance.previewDashboardTab")}
                  </button>
                  <button
                    onClick={() => setPreviewTab("signin")}
                    className={cn(
                      "px-3 py-2 text-sm font-medium border-b-2 transition-colors",
                      previewTab === "signin"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t("appearance.previewSignInTab")}
                  </button>
                </div>

                {/* Dashboard Preview */}
                {(() => {
                  // Background wallpaper preview — mirrors the real
                  // .bg-scoped-layer / .app-wallpaper-layer CSS (globals.css)
                  // so the BG tab's image/opacity/blur/brightness/dim settings
                  // are actually visible here. applyAppearance(draft) already
                  // updates these --app-wallpaper* vars live (see the effect
                  // above); this mockup previously never rendered anything
                  // that reads them, so BG changes had no visible preview.
                  const wallpaperLayer = draft.background.imageData && (
                    <>
                      <div
                        className="pointer-events-none absolute inset-0"
                        style={{
                          zIndex: -1,
                          backgroundImage: "var(--app-wallpaper)",
                          backgroundSize: "var(--app-wallpaper-size)",
                          backgroundPosition: "center",
                          filter: "blur(var(--app-wallpaper-blur, 0px)) brightness(var(--app-wallpaper-brightness, 100%))",
                          opacity: "var(--app-wallpaper-opacity, 0)",
                        }}
                      />
                      <div
                        className="pointer-events-none absolute inset-0 bg-black"
                        style={{ zIndex: -1, opacity: "var(--app-wallpaper-dim, 0)" }}
                      />
                    </>
                  );
                  return previewTab === "dashboard" && (
                  <div className="relative isolate flex overflow-hidden rounded-2xl border shadow-xl">
                  {draft.background.target === "app" && wallpaperLayer}
                  <div
                    className={cn(
                      "relative isolate flex w-14 shrink-0 flex-col items-center gap-3 py-4",
                      draft.background.imageData && "sidebar-glass"
                    )}
                    // Opaque background only when there's no wallpaper to
                    // show through — same rule the real Sidebar follows
                    // (sidebar-glass, driven by .glass-mode, takes over
                    // otherwise). Without this, the mockup's own inline
                    // background would mask the wallpaper even though the
                    // real app doesn't.
                    style={draft.background.imageData ? undefined : { background: "var(--sidebar)" }}
                  >
                    {draft.background.target === "sidebar" && wallpaperLayer}
                    <div
                      className="flex size-8 items-center justify-center overflow-hidden rounded-lg"
                      style={{ background: "var(--sidebar-primary)", color: "var(--sidebar-primary-foreground)" }}
                      title={draft.appName}
                    >
                      {draft.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={draft.logo} alt="" className="size-full object-contain p-1" />
                      ) : (
                        <Workflow className="size-4" />
                      )}
                    </div>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="size-6 rounded-md"
                        style={
                          i === 1
                            ? { background: "var(--sidebar-primary)" }
                            : { background: "color-mix(in oklch, var(--sidebar-foreground) 18%, transparent)" }
                        }
                      />
                    ))}
                  </div>

                  <div
                    className="relative isolate flex-1 p-4"
                    // Same reasoning as the sidebar above — the real <main>
                    // has no background of its own, so this stays
                    // transparent whenever there's a wallpaper to reveal.
                    style={{
                      color: "var(--foreground)",
                      ...(draft.background.imageData ? {} : { background: "var(--background)" }),
                    }}
                  >
                    {draft.background.target === "dashboard" && wallpaperLayer}
                    <div className="mb-3 flex items-center gap-2">
                      {draft.logo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={draft.logo} alt="" className="size-5 shrink-0 rounded object-contain" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold leading-tight">{draft.appName || "Business Rules Engine"}</p>
                        <p className="truncate text-[9.5px] leading-tight" style={{ color: "var(--muted-foreground)" }}>
                          {draft.tagline || "Decision Platform"}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4 flex items-center gap-2">
                      <div className="h-7 flex-1 rounded-md" style={{ background: "var(--muted)" }} />
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="size-7 rounded-md border" />
                      ))}
                      <div className="size-7 rounded-md" style={{ background: "var(--primary)" }} />
                    </div>

                    <div className="mb-3 grid grid-cols-3 gap-2.5">
                      {[
                        { label: t("mockup.revenue"), value: "₹42L", trend: "+12%", up: true },
                        { label: t("mockup.sessions"), value: "148", trend: "+8%", up: true },
                        { label: t("mockup.payables"), value: "₹6L", trend: "-3%", up: false },
                      ].map((k) => (
                        <div key={k.label} className="rounded-lg border p-2.5" style={{ background: "var(--card)" }}>
                          <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                            {k.label}
                          </p>
                          <p className="text-sm font-bold">{k.value}</p>
                          <p
                            className={cn(
                              "flex items-center gap-0.5 text-[10px]",
                              k.up ? "text-emerald-600" : "text-red-500"
                            )}
                          >
                            {k.up ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
                            {k.trend}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="mb-3 grid grid-cols-2 gap-2.5">
                      <div className="rounded-lg border p-2.5" style={{ background: "var(--card)" }}>
                        <p className="mb-1.5 text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                          {t("mockup.billingTrend")}
                        </p>
                        <div className="flex h-10 items-end gap-1">
                          {[40, 55, 35, 70, 50, 80].map((h, i) => (
                            <div
                              key={i}
                              className="flex-1 rounded-sm"
                              style={{ height: `${h}%`, background: i === 5 ? "var(--primary)" : "var(--muted)" }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="rounded-lg border p-2.5" style={{ background: "var(--card)" }}>
                        <p className="mb-1.5 text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                          {t("mockup.engagements")}
                        </p>
                        <div className="space-y-1">
                          {["Astra Mfg", "Nexora Bank", "Helio HC"].map((n, i) => (
                            <div key={n} className="flex items-center gap-1.5 text-[10px]">
                              <span className="size-1.5 rounded-full" style={{ background: `var(--chart-${i + 1})` }} />
                              {n}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {draft.showInsights && (
                      <div
                        className="mb-3 flex items-center gap-2 rounded-lg p-2.5 text-[10px]"
                        style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
                      >
                        <Sparkles className="size-3 shrink-0" /> {t("mockup.smartInsightPrefix")} {t("mockup.smartInsightBody")}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <div
                        className="rounded-lg px-3 py-1.5 text-[10px] font-medium"
                        style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                      >
                        {t("mockup.newEngagement")}
                      </div>
                      <div className="rounded-lg border px-3 py-1.5 text-[10px] font-medium">{t("mockup.exportCsv")}</div>
                    </div>
                  </div>
                  </div>
                  );
                })()}

                {/* Sign-in Page Preview - Split Layout, matching the real
                    /login page's current design: diagonal sidebar-token
                    gradient on the left (so theme/color changes actually
                    show here), radial-gradient card panel on the right,
                    same fixed #0a1230 ink and bordered/taller fields the
                    real page uses regardless of the active theme. */}
                {previewTab === "signin" && (
                  <div className="flex overflow-hidden rounded-2xl border shadow-xl h-96">
                    {/* Left Side - Dark Brand Panel */}
                    <div
                      className="flex-1 p-4 flex flex-col justify-between items-start relative overflow-hidden"
                      style={{
                        background:
                          "linear-gradient(135deg, color-mix(in oklch, var(--sidebar) 88%, black 12%) 0%, var(--sidebar) 45%, color-mix(in oklch, var(--sidebar) 78%, var(--sidebar-primary) 22%) 100%)",
                        color: "var(--sidebar-foreground)",
                      }}
                    >
                      <div>
                        <div className="relative z-10 flex items-center gap-2">
                          <div
                            className="flex size-10 items-center justify-center overflow-hidden rounded-lg shrink-0"
                            style={{ background: "var(--sidebar-primary)", color: "var(--sidebar-primary-foreground)" }}
                          >
                            {draft.logo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={draft.logo} alt="" className="size-full object-contain p-1" />
                            ) : (
                              <Workflow className="size-6" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold leading-tight">{draft.appName || "Business Rules System"}</p>
                            <p className="text-[8px]" style={{ color: "color-mix(in oklch, var(--sidebar-foreground) 60%, transparent)" }}>{draft.tagline || "Decision Platform"}</p>
                          </div>
                        </div>

                        <p className="mt-4 text-sm font-semibold leading-snug text-balance">
                          One decision platform for every industry.
                        </p>
                      </div>

                      <div className="grid w-full grid-cols-3 gap-1.5">
                        {[
                          { label: "Total Rules", value: "157" },
                          { label: "Active Rules", value: "97" },
                          { label: "Simulations", value: "263" },
                        ].map((s) => (
                          <div
                            key={s.label}
                            className="rounded-md border p-1.5 text-center"
                            style={{ borderColor: "var(--sidebar-border)", background: "color-mix(in oklch, var(--sidebar-accent) 40%, transparent)" }}
                          >
                            <p className="text-[10px] font-bold" style={{ color: "var(--sidebar-primary)" }}>{s.value}</p>
                            <p className="text-[7px]" style={{ color: "color-mix(in oklch, var(--sidebar-foreground) 75%, transparent)" }}>{s.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right Side - Sign-in Form */}
                    <div
                      className="flex-1 p-6 flex flex-col items-center justify-center"
                      style={{
                        background:
                          "radial-gradient(400px 300px at 100% 0%, #eef3ff 0%, transparent 60%), radial-gradient(300px 250px at 0% 100%, #fff4e0 0%, transparent 60%), #fbfcff",
                      }}
                    >
                      <div className="w-full max-w-sm space-y-5">
                        <div>
                          <p className="text-lg font-bold" style={{ color: "#0a1230" }}>Welcome Back</p>
                          <p className="text-xs" style={{ color: "color-mix(in srgb, #0a1230 70%, transparent)" }}>
                            Sign in to your {draft.appName || "Business Rules System"} account
                          </p>
                        </div>

                        <div className="space-y-3">
                          {/* Employee ID Input */}
                          <div className="space-y-1">
                            <p className="text-xs font-bold" style={{ color: "#0a1230" }}>Employee ID</p>
                            <div
                              className="h-9 rounded-lg border px-2.5 flex items-center text-xs"
                              style={{ borderColor: "#c7cfe3", background: "transparent" }}
                            >
                              <p style={{ color: "color-mix(in srgb, #0a1230 55%, transparent)" }}>EMP-0001</p>
                            </div>
                          </div>

                          {/* Password Input */}
                          <div className="space-y-1">
                            <p className="text-xs font-bold" style={{ color: "#0a1230" }}>Password</p>
                            <div
                              className="h-9 rounded-lg border px-2.5 flex items-center justify-between text-xs"
                              style={{ borderColor: "#c7cfe3", background: "transparent" }}
                            >
                              <p style={{ color: "color-mix(in srgb, #0a1230 55%, transparent)" }}>••••••••</p>
                            </div>
                          </div>

                          {/* Remember Me & Forgot Password */}
                          <div className="flex items-center justify-between text-xs">
                            <label className="flex items-center gap-1.5" style={{ color: "#0a1230" }}>
                              <input type="checkbox" className="size-3.5" />
                              Remember me
                            </label>
                            <a href="#" style={{ color: "var(--primary)" }} className="font-medium">
                              Forgot password?
                            </a>
                          </div>

                          {/* Sign-in Button */}
                          <div
                            className="h-9 rounded-lg flex items-center justify-center font-semibold text-xs cursor-pointer shadow-sm"
                            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                          >
                            Sign In
                          </div>

                          {/* Demo Mode */}
                          <p className="text-center text-xs" style={{ color: "color-mix(in srgb, #0a1230 70%, transparent)" }}>
                            Need Demo Access?{" "}
                            <span style={{ color: "#0a1230" }} className="font-medium">
                              Enter Demo Mode
                            </span>
                          </p>
                        </div>

                        {/* Features */}
                        <div className="grid grid-cols-2 gap-2 border-t pt-3">
                          <div className="text-[9px]" style={{ color: "color-mix(in srgb, #0a1230 80%, transparent)" }}>
                            <p className="flex items-center gap-1 font-medium"><ShieldCheck className="size-2.5" style={{ color: "var(--primary)" }} /> Secure Access</p>
                          </div>
                          <div className="text-[9px]" style={{ color: "color-mix(in srgb, #0a1230 80%, transparent)" }}>
                            <p className="flex items-center gap-1 font-medium"><ShieldCheck className="size-2.5" style={{ color: "var(--primary)" }} /> Role-Based Permissions</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Tabs>
    </div>
  );
}
