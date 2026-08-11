"use client";

import { useEffect, useState } from "react";
import { Menu, Search, Plus, Palette, ShieldCheck } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { LogoLockup } from "./logo";
import aiFoundryLogoBlack from "@/assets/AI-Foundry-Black.png";
import aiFoundryLogoWhite from "@/assets/AI-Foundry.png";
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
      <header className="z-20 ml-0 mr-1 mt-2 mb-2 flex h-14 shrink-0 items-center gap-2 rounded-2xl border border-white/40 bg-gradient-to-r from-sidebar/80 via-sidebar/60 to-sidebar/40 px-3 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.1)] backdrop-blur-xl dark:border-white/10 dark:from-black/40 dark:to-black/10 sm:ml-0 sm:mr-2 sm:px-4 transition-all duration-300 ease-out hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.15)]">
        <Button variant="ghost" size="icon" className="size-9 md:hidden" onClick={onOpenMobileNav} aria-label="Open menu">
          <Menu className="size-[18px]" />
        </Button>
        <div className="md:hidden">
          <LogoLockup collapsed />
        </div>

        <div className="hidden lg:flex items-center group cursor-pointer">
          <Image 
            src={aiFoundryLogoBlack} 
            alt="AI Foundry" 
            className="dark:hidden h-6 w-auto object-contain opacity-80" 
            style={{ animation: 'topbarLogoPulseLight 4s ease-in-out infinite' }}
          />
          <Image 
            src={aiFoundryLogoWhite} 
            alt="AI Foundry" 
            className="hidden dark:block h-6 w-auto object-contain opacity-80" 
            style={{ animation: 'topbarLogoPulseDark 4s ease-in-out infinite' }}
          />
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setPaletteOpen(true)}
            aria-label="Search"
            className="group relative flex h-9 w-9 shrink-0 items-center justify-center gap-2 overflow-hidden rounded-full border bg-card/50 text-sm text-muted-foreground transition-all duration-300 ease-out hover:bg-card hover:shadow-sm hover:ring-1 hover:ring-primary/20 sm:w-60 sm:justify-start sm:px-3"
          >
            <Search className="size-4 shrink-0 transition-transform duration-300 group-hover:text-primary" />
            <span className="hidden whitespace-nowrap sm:inline">{t("header.searchPlaceholder")}</span>
            <kbd className="absolute right-1.5 top-1.5 hidden h-6 items-center rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:flex">
              ⌘K
            </kbd>
          </button>
          
          {isDashboard && (
            <>
              <MobileFilterButton />
              <GlobalFilterBar />
            </>
          )}
          <Button variant="secondary" size="sm" className="h-9 gap-1.5 hidden md:flex font-semibold text-primary dark:text-foreground bg-white dark:bg-card shadow-sm border border-[#D0E4F5] dark:border-border hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground transition-colors" onClick={() => setSwitcherOpen(true)}>
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
