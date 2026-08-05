"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";
import { ChatBot } from "./chatbot";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  const isLoginRoute = pathname === "/login";

  useEffect(() => {
    // Wait for the persisted session to actually load before deciding —
    // otherwise every fresh page load would flash to /login before we know
    // whether the user was really signed in.
    if (!hasHydrated || isLoginRoute) return;
    if (!isAuthenticated) router.replace("/login");
  }, [hasHydrated, isAuthenticated, isLoginRoute, router]);

  // The login screen owns its own full-bleed layout — no sidebar/header shell.
  if (isLoginRoute) {
    return <>{children}</>;
  }

  if (!hasHydrated || !isAuthenticated) {
    return null;
  }

  return (
    <div className="relative flex h-full w-full">
      <a
        href="#main-content"
        className="fixed top-2 left-2 z-[60] -translate-y-16 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground opacity-0 shadow-lg transition-transform focus:translate-y-0 focus:opacity-100"
      >
        Skip to main content
      </a>
      <Sidebar />
      <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main id="main-content" tabIndex={-1} className="relative min-h-0 flex-1 overflow-hidden outline-none">
          <div className="bg-scoped-layer bg-scoped-layer--dashboard" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="absolute inset-0 flex flex-col pb-[4px]"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <ChatBot />
    </div>
  );
}
