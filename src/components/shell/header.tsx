"use client";

import { useEffect, useState } from "react";
import { Menu, Search, Plus, Palette, ShieldCheck } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogoLockup } from "./logo";
import { GlobalFilterBar, MobileFilterButton } from "./global-filter-bar";
import { HelpDesk } from "./help-desk";
import { UserMenu } from "./user-menu";
import { CommandPalette } from "./command-palette";
import { RoleSwitcherDialog } from "./role-switcher-dialog";
import { AppearanceStudio } from "@/components/studio/appearance-studio";
import { useTranslate } from "@/lib/use-translate";
import { useAppStore, useHasCapability } from "@/lib/store";

export function Header({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const appearanceOpen = useAppStore((s) => s.appearanceOpen);
  const setAppearanceOpen = useAppStore((s) => s.setAppearanceOpen);
  const router = useRouter();
  const t = useTranslate();
  const canCreateRule = useHasCapability("rule.create");
  // The Domain filter only ever scopes the Dashboard's widgets (globalFilters
  // is consumed nowhere else) — showing it on every other page implied it
  // did something there too, when it silently did nothing.
  const isDashboard = usePathname() === "/dashboard";

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3 backdrop-blur-sm sm:px-4" style={{ background: 'linear-gradient(180deg, rgba(234, 242, 250, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)' }}>
        <Button variant="ghost" size="icon" className="size-9 md:hidden" onClick={onOpenMobileNav} aria-label="Open menu">
          <Menu className="size-[18px]" />
        </Button>
        <div className="md:hidden">
          <LogoLockup collapsed />
        </div>

        <button
          onClick={() => setPaletteOpen(true)}
          aria-label="Search"
          className="ml-1 flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-lg border bg-card px-0 text-sm text-muted-foreground transition-colors hover:border-ring/50 sm:ml-3 sm:w-full sm:max-w-70 sm:justify-start sm:px-3"
        >
          <Search className="size-3.5 shrink-0" />
          <span className="hidden sm:inline">{t("header.searchPlaceholder")}</span>
          <kbd className="ml-auto hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-sm sm:inline">
            ⌘K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {isDashboard && (
            <>
              <MobileFilterButton />
              <GlobalFilterBar />
            </>
          )}
          <Button variant="secondary" size="sm" className="h-9 gap-1.5 hidden md:flex font-semibold text-primary bg-white shadow-sm border border-[#D0E4F5]" onClick={() => setSwitcherOpen(true)}>
            <ShieldCheck className="size-3.5" />
            <span className="hidden lg:inline">Switch User</span>
          </Button>
          {canCreateRule && (
            <Button size="sm" className="h-9 gap-1.5" onClick={() => router.push("/rule-builder")} aria-label="Create Rule">
              <Plus className="size-3.5" />
              <span className="hidden lg:inline">{t("header.createRule")}</span>
            </Button>
          )}
          <div className="mx-0.5 hidden h-6 w-px bg-border sm:block" />
          <Button
            variant="ghost"
            size="icon"
            className="hidden size-9 sm:flex"
            onClick={() => setAppearanceOpen(true)}
            aria-label="Appearance Studio"
          >
            <Palette className="size-[18px]" />
          </Button>
          <HelpDesk />
          <UserMenu />
        </div>
      </header>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      {appearanceOpen && <AppearanceStudio open={appearanceOpen} onOpenChange={setAppearanceOpen} />}
      <RoleSwitcherDialog open={switcherOpen} onOpenChange={setSwitcherOpen} />
    </>
  );
}
