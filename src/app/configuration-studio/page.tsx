"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Settings2,
  ShieldAlert,
  Database,
  Boxes,
  FileJson,
  Tag,
  LayoutTemplate,
  Building2,
  Package,
  Link2,
  Users,
  IdCard,
  Workflow,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";
import { useAppStore, useHasCapability } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IndustriesManager } from "@/components/studio/industries-manager";
import { FieldCatalogManager } from "@/components/studio/field-catalog-manager";
import { EntityCatalogManager } from "@/components/studio/entity-catalog-manager";
import { JsonMappingManager } from "@/components/studio/json-mapping-manager";
import { RuleCategoryManager } from "@/components/studio/rule-category-manager";
import { RuleTemplatesManager } from "@/components/studio/rule-templates-manager";
import { ProductManager } from "@/components/studio/product-manager";
import { ProductRuleMappingManager } from "@/components/studio/product-rule-mapping-manager";
import { DashboardManagementManager } from "@/components/studio/dashboard-management-manager";
import { UserManager } from "@/components/studio/user-manager";
import { JobTitleManager } from "@/components/studio/job-title-manager";
import { NotifyXManager } from "@/components/studio/notify-x-manager";
import { ConfigStudioNav } from "@/components/studio/config-studio-nav";

type SectionId =
  | "fields"
  | "entities"
  | "json-mapping"
  | "categories"
  | "rule-templates"
  | "products"
  | "product-rule-mapping"
  | "dashboard-management"
  | "industries"
  | "users"
  | "job-titles"
  | "notifyx";

interface NavItem {
  id: SectionId;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Data & Schema",
    items: [
      { id: "fields", label: "Field Catalog", icon: Database },
      { id: "entities", label: "Entity Catalog", icon: Boxes },
      { id: "json-mapping", label: "JSON Mapping", icon: FileJson },
    ],
  },
  {
    label: "Rule Governance",
    items: [
      { id: "industries", label: "Domains", icon: Building2 },
      { id: "products", label: "Product Master", icon: Package },
      { id: "product-rule-mapping", label: "Product-Rule Mapping", icon: Link2 },
      { id: "categories", label: "Rule Categories", icon: Tag },
      { id: "rule-templates", label: "Rule Templates", icon: LayoutTemplate },
    ],
  },
  {
    label: "Access",
    items: [
      { id: "users", label: "User Management", icon: Users },
      { id: "job-titles", label: "Job Titles", icon: IdCard },
    ],
  },
  {
    label: "Automation",
    items: [
      { id: "notifyx", label: "NotifyX", icon: Workflow },
    ],
  },
  {
    label: "Experience",
    items: [
      { id: "dashboard-management", label: "Dashboard Management", icon: LayoutDashboard },
    ],
  },
];

const SECTION_DESCRIPTIONS: Record<SectionId, string> = {
  fields: "The business field vocabulary that drives every condition dropdown in Rule Builder and every dynamic input in the Simulator.",
  entities: "Business entities (Applicant, Loan Account, Collateral...) that Field Catalog entries attach to — this is what groups fields into sections in Rule Builder's Available Attributes panel.",
  "json-mapping": "Map incoming/outgoing API JSON attributes to internal BRE fields — the foundation for integrating a real source system.",
  categories: "Rule categories available in the Rule Builder and Repository filters.",
  "rule-templates": "Reusable starting shapes for Rule Builder's condition and action editors — pre-fill a rule, then edit freely.",
  products: "Configurable product/scheme master (Home Loan, Auto Loan, ...) — a client can offer many. Rules stay standalone; see Product-Rule Mapping for which rules apply to each.",
  "product-rule-mapping": "Map each product to the rules that should execute for it — many-to-many. This is what /api/decision uses to identify and run only the rules mapped to the request's product.",
  "dashboard-management": "Controls where each user lands after sign-in, and which KPI cards, quick actions and widgets show on their Dashboard by default — configurable per user, no code required.",
  industries: "Every business domain/vertical the platform supports.",
  users: "Grant each user product- and category-specific System Permissions, and manage which Rule Categories they're authorized to approve under Maker-Checker.",
  "job-titles": "Maintain the list of Job Titles offered in User Management's Add/Edit User dropdown. Job Title is a display label only — a user's access is set entirely in User Management (Administrator flag + product/category permissions).",
  notifyx: "Automate reminders, escalations, and notifications with trigger -> condition -> action workflows.",
};

export default function ConfigurationStudioPage() {
  const router = useRouter();
  const currentUser = useAppStore((s) => s.currentUser);
  const canManageConfig = useHasCapability("config.manage");
  const [section, setSection] = useState<SectionId>("fields");

  if (!canManageConfig) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <ShieldAlert className="size-10 text-muted-foreground/40" />
        <h1 className="text-base font-semibold">Access restricted</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {currentUser.name}&apos;s role doesn&apos;t include permission to manage Configuration Studio.
        </p>
        <Button variant="outline" size="sm" onClick={() => router.push("/")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b bg-card/40 px-5 py-3.5 sm:px-6">
        <span className="flex size-9 items-center justify-center rounded-xl border bg-muted/40">
          <Settings2 className="size-4.5 text-muted-foreground" />
        </span>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Configuration Studio</h1>
          <p className="text-sm text-muted-foreground">
            No-code configuration layer — every industry, field, mapping, category and rule-governance setting used
            across the platform lives here.
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <ConfigStudioNav groups={NAV_GROUPS} roadmap={[]} activeSection={section} onSelect={setSection} />

        <ScrollArea className="min-h-0 min-w-0 flex-1">
          <div className="mx-auto max-w-350 space-y-3 px-5 py-5 sm:px-6">
            {section !== "users" && (
              <div>
                <h2 className="text-sm font-semibold">{[...NAV_GROUPS.flatMap((g) => g.items)].find((i) => i.id === section)?.label}</h2>
                <p className="text-sm text-muted-foreground">{SECTION_DESCRIPTIONS[section]}</p>
              </div>
            )}

            {section === "fields" && <FieldCatalogManager />}
            {section === "entities" && <EntityCatalogManager />}
            {section === "json-mapping" && <JsonMappingManager />}
            {section === "categories" && <RuleCategoryManager />}
            {section === "rule-templates" && <RuleTemplatesManager />}
            {section === "products" && <ProductManager />}
            {section === "product-rule-mapping" && <ProductRuleMappingManager />}
            {section === "dashboard-management" && <DashboardManagementManager />}
            {section === "industries" && <IndustriesManager />}
            {section === "users" && <UserManager />}
            {section === "job-titles" && <JobTitleManager />}
            {section === "notifyx" && <NotifyXManager />}

            {section === "fields" && (
              <p className="pt-2 text-sm text-muted-foreground">
                Looking for the full metadata overview across every module? See the{" "}
                <Link href="/metadata-explorer" className="text-primary hover:underline">Metadata Explorer</Link>.
              </p>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
