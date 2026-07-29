"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { NAV_ITEMS, NAV_ITEMS_SECONDARY, visibleNavItems } from "@/lib/nav";
import { useAppStore, useEffectiveCapabilities } from "@/lib/store";
import { StatusBadge } from "@/components/status-badge";

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const rules = useAppStore((s) => s.rules);
  const capabilities = useEffectiveCapabilities();
  const [query, setQuery] = useState("");

  useEffect(() => {
    // Clear the search term whenever the dialog closes, so it reopens fresh.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!open) setQuery("");
  }, [open]);

  if (!open) return null;

  const matchedRules = query.length > 0
    ? rules.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()) || r.id.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : [];

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Search" description="Search rules and navigate the platform">
      <CommandInput placeholder="Search rules, modules, actions..." value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {visibleNavItems([...NAV_ITEMS, ...NAV_ITEMS_SECONDARY], capabilities).filter((i) => !i.disabled).map((item) => (
            <CommandItem key={item.href} onSelect={() => go(item.href)}>
              <item.icon className="size-4" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        {matchedRules.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Rules">
              {matchedRules.map((r) => (
                <CommandItem key={r.id} onSelect={() => go(`/rule-builder?id=${r.id}`)} className="justify-between">
                  <span className="flex items-center gap-2">
                    <CommandShortcut className="static font-mono text-sm">{r.id}</CommandShortcut>
                    {r.name}
                  </span>
                  <StatusBadge status={r.status} />
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        <CommandSeparator />
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => go("/rule-builder")}>Create New Rule</CommandItem>
          <CommandItem onSelect={() => go("/simulator")}>Launch Simulator</CommandItem>
          <CommandItem onSelect={() => go("/matrix")}>Open Decision Matrix</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
