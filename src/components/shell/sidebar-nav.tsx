"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, NAV_ITEMS_SECONDARY, visibleNavItems } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useEffectiveCapabilities } from "@/lib/store";
import { useTranslate } from "@/lib/use-translate";
import { Badge } from "@/components/ui/badge";

function NavLink({
  href,
  label,
  Icon,
  collapsed,
  disabled,
  badge,
  onNavigate,
}: {
  href: string;
  label: string;
  Icon: React.ElementType;
  collapsed: boolean;
  disabled?: boolean;
  badge?: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const linkClassName = cn(
    // transition only color/background/shadow — NOT border-radius. Radius
    // switches instantly between the pill (inactive) and rounded-rect
    // (active) shapes; letting it animate via transition-all made the item
    // visibly morph shape on click, which combined with the focus ring's
    // offset (removed below) read as a "jerk" until the route settled.
    "group relative flex h-9.5 items-center gap-3 px-2.5 text-sm transition-[background-color,color,box-shadow] duration-200 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
    collapsed && "justify-center px-0",
    disabled
      ? "cursor-not-allowed text-sidebar-foreground/35 rounded-full"
      : active
      ? "bg-[linear-gradient(90deg,#0462c8,#135aa2)] text-white font-[600] shadow-[0_8px_18px_-10px_#0462c880] rounded-[10px]"
      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground font-medium rounded-full"
  );

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) e.preventDefault();
    else onNavigate?.();
  };

  const linkContent = (
    <>
      <Icon className={cn("size-4 shrink-0 transition-transform duration-200 group-hover:scale-110", active && "text-sidebar-primary-foreground")} strokeWidth={2.2} />
      {!collapsed && <span className="truncate" title={label}>{label}</span>}
      {!collapsed && badge ? (
        <Badge className="ml-auto h-4.5 min-w-4.5 rounded-full px-1 text-sm">{badge}</Badge>
      ) : null}
      {collapsed && badge ? (
        <span className="absolute right-1 top-1 size-1.5 rounded-full bg-destructive" />
      ) : null}
    </>
  );

  // Disabled items render as an inert span, not a real link — an anchor with
  // href="#" is still announced and focusable by screen readers even with
  // aria-disabled, which misrepresents a "not built yet" nav entry as a
  // working link.
  const renderTarget = disabled ? (
    <span aria-disabled="true" tabIndex={-1} className={linkClassName} />
  ) : (
    <Link href={href} aria-current={active ? "page" : undefined} onClick={handleClick} className={linkClassName} />
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={renderTarget}>{linkContent}</TooltipTrigger>
        <TooltipContent side="right">{label}{disabled ? " (Phase 2)" : ""}</TooltipContent>
      </Tooltip>
    );
  }

  return disabled ? (
    <span aria-disabled="true" tabIndex={-1} className={linkClassName}>
      {linkContent}
    </span>
  ) : (
    <Link href={href} aria-current={active ? "page" : undefined} onClick={handleClick} className={linkClassName}>
      {linkContent}
    </Link>
  );
}

export function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const capabilities = useEffectiveCapabilities();
  const t = useTranslate();
  const primaryItems = visibleNavItems(NAV_ITEMS, capabilities);
  const secondaryItems = visibleNavItems(NAV_ITEMS_SECONDARY, capabilities);

  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-2.5 py-4">
      <div className="flex flex-col gap-0.5">
        {!collapsed && (
          <p className="px-2.5 pb-1 text-sm font-semibold uppercase tracking-wider text-sidebar-foreground/40">
            {t("nav.workspace")}
          </p>
        )}
        {primaryItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={t(item.labelKey)}
            Icon={item.icon}
            collapsed={collapsed}
            disabled={item.disabled}
            onNavigate={onNavigate}
          />
        ))}
      </div>
      <div className="flex flex-col gap-0.5">
        {!collapsed && (
          <p className="px-2.5 pb-1 text-sm font-semibold uppercase tracking-wider text-sidebar-foreground/40">
            {t("nav.platform")}
          </p>
        )}
        {secondaryItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={t(item.labelKey)}
            Icon={item.icon}
            collapsed={collapsed}
            disabled={item.disabled}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </nav>
  );
}
