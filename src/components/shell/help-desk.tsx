"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  HelpCircle,
  Mail,
  Phone,
  Clock,
  ExternalLink,
  ChevronDown,
  BookOpen,
  Search,
  Pin,
  Rocket,
  LayoutDashboard,
  Workflow,
  ShieldCheck,
  FileEdit,
  ListTree,
  Link2,
  ListOrdered,
  Grid3x3,
  Library,
  History,
  UploadCloud,
  Package,
  Route,
  PlayCircle,
  Cpu,
  FlaskConical,
  Braces,
  Bug,
  Compass,
  Settings2,
  Users,
  ScrollText,
  Building2,
  Gauge,
  Tag,
  AlertTriangle,
  ListChecks,
  Boxes,
  Database,
  FileJson,
  KeyRound,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export type GuideDifficulty = "Beginner" | "Intermediate" | "Advanced";

export interface Guide {
  id: string;
  title: string;
  description: string;
  difficulty: GuideDifficulty;
  readingTime: string;
  module: string;
  icon: LucideIcon;
  /** Full guide body, shown as an inline expand under the card. Guides
   *  without content yet fall back to the "coming soon" toast. */
  content?: string[];
}

export interface GuideCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  guides: Guide[];
}

// The Knowledge Center's content, structured like the docs sets in IBM ODM /
// Pega / ServiceNow help panels — categorized, scannable, each entry a
// 2-5 minute read. Guides with a `content` array expand inline in the drawer
// (no new route); guides without one yet fall back to a "coming soon" toast.
// Exported so the BRE Assistant chatbot (chatbot.tsx) is trained directly on
// this same content instead of maintaining a separate, thinner knowledge base
// that could drift out of sync with what's actually written here.
export const GUIDE_CATEGORIES: GuideCategory[] = [
  {
    id: "getting-started",
    label: "Getting Started",
    icon: Rocket,
    guides: [
      {
        id: "gs-1",
        title: "Getting Started with GenericBRE",
        description: "A first tour of the platform — workspace, navigation, and where things live.",
        difficulty: "Beginner",
        readingTime: "3 min",
        module: "Dashboard",
        icon: Rocket,
        content: [
          "GenericBRE is a no-code Business Rules Engine: you configure decision logic instead of writing it, and the platform evaluates it consistently across every product and industry you support.",
          "The core loop is simple: author a rule in Rule Builder, map it to a Product so the platform knows when it applies, then run it through Rule Simulator to see the exact decision it produces before anyone else does.",
          "Start on the Dashboard for a live snapshot of your rule catalog, use Rule Repository to browse everything that exists, and come back to this Knowledge Center any time you need a refresher.",
        ],
      },
      {
        id: "gs-2",
        title: "Platform Overview",
        description: "How rules, products, matrices, and simulations fit together end to end.",
        difficulty: "Beginner",
        readingTime: "4 min",
        module: "Dashboard",
        icon: LayoutDashboard,
        content: [
          "Four building blocks make up everything here: Rules (the IF/THEN logic), Products (what a set of rules is attached to), Decision Matrices (spreadsheet-style lookup tables for pricing and thresholds), and Simulations (a dry run of a product's rules against a sample input).",
          "A Product doesn't contain logic itself — it points to an ordered list of Rules via Product–Rule Mapping. Running a simulation executes that exact list, in that exact order, chaining each rule's output into the next where needed.",
          "A rule's actions can also pull a value from a Decision Matrix instead of a hardcoded number, so a pricing change becomes a matrix edit, not a rule rewrite.",
          "Everything else in the navigation — Metadata Explorer, Audit Log, Configuration Studio — supports those four: field definitions, traceability, and platform-wide settings.",
        ],
      },
      {
        id: "gs-3",
        title: "Understanding the BRE Workflow",
        description: "The lifecycle a rule moves through, from Draft to Active in production.",
        difficulty: "Beginner",
        readingTime: "3 min",
        module: "Rule Builder",
        icon: Workflow,
        content: [
          "Every rule moves through the same lifecycle: Draft, Testing, Active, Inactive, Archived. A Draft is still being authored and never runs in a live simulation.",
          "Testing is where a rule goes once it's ready for review — it can be sandbox-tested against real products in Rule Simulator without affecting anyone else's results, so a reviewer can see its real effect before approving it.",
          "Active is live: it's included in every simulation for the product it's mapped to. Inactive and Archived retire a rule without deleting its history — both stay fully visible in Rule Repository and the Audit Log.",
          "Every status change is written to the Audit Log automatically, with who made it and when.",
        ],
      },
      {
        id: "gs-4",
        title: "Maker & Checker Workflow",
        description: "How review and approval keeps one person from publishing unchecked.",
        difficulty: "Intermediate",
        readingTime: "4 min",
        module: "Rule Repository",
        icon: ShieldCheck,
        content: [
          "Maker & Checker is a governance control: the person who authors or edits a rule (the maker) is never the same person who approves it for production (the checker), so no single person can silently publish a change.",
          "In practice: a maker moves a rule to Testing. A checker opens Rule Simulator, runs a Sandbox Test that includes the pending rule, and reviews exactly what it would decide, all without it affecting live results for anyone else.",
          "Once satisfied, the checker approves the rule and it becomes Active. If something looks wrong, they reject it back to the maker with the reason on record.",
          "Every approval and rejection is logged to the Audit Log — who requested it, who reviewed it, and the outcome — so the full trail survives long after the conversation does.",
        ],
      },
    ],
  },
  {
    id: "rule-management",
    label: "Rule Management",
    icon: FileEdit,
    guides: [
      {
        id: "rm-1",
        title: "Creating a Rule",
        description: "Step-by-step: naming, conditions, actions, and saving a draft.",
        difficulty: "Beginner",
        readingTime: "5 min",
        module: "Rule Builder",
        icon: FileEdit,
        content: [
          "Every rule starts with an ID, a name, and a domain — then a root condition group (what has to be true) and one or more actions (what happens when it is).",
          "Actions include Approve, Reject, Calculate, Assign Value, and Bracket Lookup — you're composing behavior from these building blocks, not writing code.",
          "Save it as a Draft first. A rule only starts affecting simulations once it's mapped to a product and reaches Active status.",
        ],
      },
      {
        id: "rm-2",
        title: "IF / AND / OR Conditions",
        description: "Combining conditions with per-item connectors to express real logic.",
        difficulty: "Beginner",
        readingTime: "3 min",
        module: "Rule Builder",
        icon: ListTree,
        content: [
          "A condition group is a tree: each child — a single condition or a nested group — carries its own connector to the next sibling (AND, OR, or N.A. for the last one).",
          "That per-item model means you can mix \"AND this, OR that\" within one group, instead of being forced into a single global AND/OR toggle for the whole thing.",
          "Nesting a group inside a group lets you express parenthesized logic, like \"A AND (B OR C)\" — build the inner group first, then wire it in as one child of the outer one.",
        ],
      },
      {
        id: "rm-3",
        title: "Rule Chaining",
        description: "How one rule's output becomes another rule's input in execution order.",
        difficulty: "Intermediate",
        readingTime: "4 min",
        module: "Rule Builder",
        icon: Link2,
        content: [
          "When a product's mapped rules run, each rule's Calculate or Assign Value output is folded back into the working input before the next rule in sequence runs.",
          "That means a later rule can condition on a value an earlier rule just computed — for example, a final-amount rule deducting from an eligibility rule's calculated limit.",
          "Chaining only happens across rules mapped to the same product, in the order set by Rule Sequencing — it isn't a global, always-on link between any two rules.",
        ],
      },
      {
        id: "rm-4",
        title: "Rule Sequencing",
        description: "Controlling the order rules execute in within a product's rule set.",
        difficulty: "Intermediate",
        readingTime: "3 min",
        module: "Product–Rule Mapping",
        icon: ListOrdered,
        content: [
          "A product's mapped rules run in a specific order, set in Product–Rule Mapping's Rule Sequencer — either by dragging to reorder or via a priority fallback.",
          "Order matters most when rules chain: a rule that depends on another rule's computed output has to come after it in the sequence, or that value simply won't exist yet.",
          "Reordering only changes execution order for that product — it never edits the rules themselves, so the same rule can run in a different position for a different product.",
        ],
      },
      {
        id: "rm-5",
        title: "Decision Matrix",
        description: "Configuring pricing and threshold slabs like a spreadsheet, not code.",
        difficulty: "Intermediate",
        readingTime: "4 min",
        module: "Decision Matrix",
        icon: Grid3x3,
        content: [
          "A matrix is a spreadsheet-style lookup table: rows of input ranges (like credit-score bands) mapped to output values (like an interest rate).",
          "A rule's action can pull its value from a matrix — via a Bracket Lookup — instead of hardcoding a number, so a pricing change becomes a matrix edit, not a rule rewrite and republish.",
          "Matrices are scoped by domain and lookup type (interest-rate, haircut, premium, and so on), and are checked for gaps or overlapping rows before they go live.",
        ],
      },
      {
        id: "rm-6",
        title: "Rule Repository",
        description: "Finding, filtering, and reviewing every rule in one searchable place.",
        difficulty: "Beginner",
        readingTime: "2 min",
        module: "Rule Repository",
        icon: Library,
        content: [
          "One searchable list of every rule, regardless of status, domain, or which product it's mapped to.",
          "Filter by status or domain, search by ID or name, and watch for \"Possible conflict\" flags — advisory warnings that two Active rules could fire with opposing outcomes on overlapping input.",
          "This is where you review and audit, not where you author — opening a rule for editing takes you into Rule Builder.",
        ],
      },
      {
        id: "rm-7",
        title: "Rule Versioning",
        description: "How edits create new versions without breaking what's already live.",
        difficulty: "Intermediate",
        readingTime: "3 min",
        module: "Rule Repository",
        icon: History,
        content: [
          "Editing an Active rule creates a new version rather than silently overwriting the live one, so a decision made under version N doesn't quietly change after the fact.",
          "Version history stays attached to the rule permanently, which is what makes an audit trail actually trustworthy months later.",
          "Rolling back means explicitly promoting an earlier version — it's a deliberate action you take, never an automatic \"undo.\"",
        ],
      },
      {
        id: "rm-8",
        title: "Rule Publishing",
        description: "Moving a reviewed rule from Testing to Active, safely.",
        difficulty: "Intermediate",
        readingTime: "3 min",
        module: "Rule Repository",
        icon: UploadCloud,
        content: [
          "Publishing is the step that moves a rule from Testing to Active — the exact point where it starts affecting every simulation for the product it's mapped to.",
          "This is the maker-checker gate in practice: sandbox-test the rule first (see Maker & Checker Workflow) so a reviewer sees its real effect before it goes live.",
          "Once Active, changing behavior means authoring a new edit or version — there's no direct, untracked modification of a published rule.",
        ],
      },
    ],
  },
  {
    id: "product-configuration",
    label: "Product Configuration",
    icon: Package,
    guides: [
      {
        id: "pc-1",
        title: "Product Master",
        description: "Creating and managing the products rules ultimately get mapped to.",
        difficulty: "Beginner",
        readingTime: "3 min",
        module: "Products",
        icon: Package,
        content: [
          "A Product is the unit rules attach to — \"Home Loan\" or \"Term Life Cover,\" for example — carrying its own domain (Lending, Insurance, and so on) and status.",
          "Creating a product doesn't create any logic by itself. It's a named container waiting for rules to be mapped into it via Product–Rule Mapping.",
          "Deleting a product is guarded: it's only allowed once it has zero rule mappings and no simulation history, so you can't silently orphan real historical data.",
        ],
      },
      {
        id: "pc-2",
        title: "Product–Rule Mapping",
        description: "Attaching rules to a product and setting their execution order.",
        difficulty: "Intermediate",
        readingTime: "4 min",
        module: "Products",
        icon: Route,
        content: [
          "This is where a product actually gets its logic: attach one or more rules, then set the order they run in with the Rule Sequencer.",
          "The same rule can be mapped to more than one product — a shared eligibility check doesn't need to be duplicated for every product that uses it.",
          "Unmapping a rule from a product stops it from running for that product immediately; the rule itself still exists and can still be mapped elsewhere.",
        ],
      },
      {
        id: "pc-3",
        title: "Product Execution Flow",
        description: "Tracing exactly what runs, in what order, for a given product.",
        difficulty: "Advanced",
        readingTime: "5 min",
        module: "Rule Simulator",
        icon: PlayCircle,
        content: [
          "Running a simulation resolves the product's mapped rules in sequence, builds a working input, and folds each rule's computed output back in before the next rule runs.",
          "Rule Simulator's Execution Plan shows this exact order before you even click Run; the Simulation Timeline shows each rule's real pass, fail, or skip status afterward.",
          "A rule can be skipped — its conditions simply don't match this particular input — without stopping the rest of the sequence from running.",
        ],
      },
      {
        id: "pc-4",
        title: "Product-Based Rule Engine",
        description: "How the engine resolves a product's full mapped rule set at runtime.",
        difficulty: "Advanced",
        readingTime: "5 min",
        module: "Rule Simulator",
        icon: Cpu,
        content: [
          "The engine always executes by product, not by individual rule in isolation — you run a product's full mapped set, never a single rule against production data on its own.",
          "A Testing-stage rule can be sandbox-tested alongside a product's Active rules without affecting live results or being counted in simulation history.",
          "Conflict detection runs advisory checks across a product's Active rules — opposing outcomes on overlapping conditions — but it never blocks or alters actual execution; it's a warning layer, not a gate.",
        ],
      },
    ],
  },
  {
    id: "testing-simulation",
    label: "Testing & Simulation",
    icon: FlaskConical,
    guides: [
      {
        id: "ts-1",
        title: "Rule Simulator",
        description: "Running a scenario against a product's mapped rules before go-live.",
        difficulty: "Beginner",
        readingTime: "3 min",
        module: "Rule Simulator",
        icon: FlaskConical,
        content: [
          "Pick a product, edit the sample input using the Form or JSON tab, and click Run Simulation to see the real decision that product's mapped rules would produce.",
          "The Decision card shows the outcome; Execution Plan and Simulation Timeline show exactly which rules ran, in what order, and why each one passed, failed, or was skipped.",
          "Nothing here touches production data — it's a dry run against the same engine that runs for real, so what you see is what would actually happen.",
        ],
      },
      {
        id: "ts-2",
        title: "Sample JSON Generation",
        description: "Where the sample input payload comes from and how to edit it.",
        difficulty: "Intermediate",
        readingTime: "3 min",
        module: "Rule Simulator",
        icon: Braces,
        content: [
          "The sample input is generated automatically from the fields referenced by the product's currently mapped rules — it always reflects the live configuration, never a stale template.",
          "The Form tab and the JSON tab edit the exact same underlying state, so changing a field in one is instantly reflected in the other.",
          "If you unmap or remap a rule on the product, the sample regenerates on the spot to match the new field set.",
        ],
      },
      {
        id: "ts-3",
        title: "Understanding Decision Trace",
        description: "Reading the rule-by-rule trace behind every simulated outcome.",
        difficulty: "Intermediate",
        readingTime: "4 min",
        module: "Rule Simulator",
        icon: Route,
        content: [
          "The Simulation Timeline is a rule-by-rule trace: the input each rule saw, the condition it checked, what it produced, and its Passed, Failed, or Skipped status.",
          "This is the same trace data captured for the Audit Log when decision auditing is enabled — correlation ID, rule versions, and full request/response payload together.",
          "Reading it top to bottom shows exactly how the final outcome was assembled, not just what the final outcome happened to be.",
        ],
      },
      {
        id: "ts-4",
        title: "Debugging Rule Execution",
        description: "Isolating why a rule passed, failed, or never fired.",
        difficulty: "Advanced",
        readingTime: "5 min",
        module: "Rule Simulator",
        icon: Bug,
        content: [
          "Start from the Simulation Timeline: find the first rule that behaved unexpectedly and compare the condition it shows against the actual input value you provided.",
          "A chaining issue usually traces back to an earlier rule's computed output not being what a later rule's condition expects — check the working input at each step, not just the final result.",
          "Use Sandbox Test to isolate a single pending rule's effect on a run, without the rest of a large mapped set changing anything else at the same time.",
        ],
      },
    ],
  },
  {
    id: "configuration",
    label: "Configuration",
    icon: Settings2,
    guides: [
      {
        id: "cf-1",
        title: "Metadata Explorer",
        description: "Browsing the fields, types, and sources every rule can reference.",
        difficulty: "Intermediate",
        readingTime: "3 min",
        module: "Metadata Explorer",
        icon: Compass,
        content: [
          "This is the field catalog: every field a rule's condition or action can reference, along with its type and where it's sourced from.",
          "Adding a field here makes it available across Rule Builder and Rule Simulator immediately — no redeploy needed.",
          "It's what keeps rule authoring consistent: the same field name means the same thing everywhere it's used, across every rule and every product.",
        ],
      },
      {
        id: "cf-2",
        title: "Configuration Studio",
        description: "Where appearance, modules, and platform-wide settings are managed.",
        difficulty: "Intermediate",
        readingTime: "4 min",
        module: "Configuration Studio",
        icon: Settings2,
        content: [
          "Platform-wide settings live here: branding and theming through Appearance Studio, enabled modules, execution settings, and decision-response configuration.",
          "Changes here are instance-wide, not per-rule — this is where \"configure once, evaluate everywhere\" actually happens in practice.",
          "Most changes take effect immediately for everyone using the platform, without needing a deploy or restart.",
        ],
      },
      {
        id: "cf-3",
        title: "User Management",
        description: "Roles, permissions, and who can do what across the platform.",
        difficulty: "Intermediate",
        readingTime: "3 min",
        module: "Configuration Studio",
        icon: Users,
        content: [
          "Roles and permissions determine who can author, review and approve, publish, or only view — and they're enforced server-side, not just hidden behind UI controls.",
          "The maker-checker split depends on roles being assigned correctly: a reviewer role should genuinely be a different person than the author on any given rule, not the same person wearing two hats.",
          "Role changes are themselves logged to the Audit Log, so who could do what at any point in time stays reconstructable.",
        ],
      },
      {
        id: "cf-4",
        title: "Audit Log",
        description: "Every change, who made it, and when — fully traceable.",
        difficulty: "Beginner",
        readingTime: "2 min",
        module: "Audit Log",
        icon: ScrollText,
        content: [
          "Every meaningful action — a rule created, edited, approved, rejected, or published, a simulation run, a sign-in — is recorded with who did it, what it was, and when.",
          "Filtering and searching make it possible to reconstruct exactly what happened to a specific rule, or who approved a specific change and why.",
          "This is the record a compliance review or an incident investigation starts from — it's descriptive, not something you edit.",
        ],
      },
      {
        id: "cf-5",
        title: "Entity Catalog",
        description: "Business entities that Field Catalog fields attach to, and how that groups Rule Builder's attribute list.",
        difficulty: "Beginner",
        readingTime: "3 min",
        module: "Entity Catalog",
        icon: Boxes,
        content: [
          "An entity is the business object a field actually describes — Applicant, Loan Account, Policy, Collateral, and so on. Every field in the Field Catalog can be tagged to one, so the field vocabulary stays organized by what it describes instead of one long flat list.",
          "The payoff shows up in Rule Builder: its Available Attributes panel groups fields into collapsible sections by entity, so a large field catalog stays scannable instead of one long unsorted dropdown.",
          "Entities themselves are managed here — add, edit, delete — but assigning a field to one happens back in Field Catalog's own Entity picker, not on this page.",
        ],
      },
      {
        id: "cf-6",
        title: "Field Catalog",
        description: "The business field vocabulary — every field a rule can reference, with its type, domain, and entity.",
        difficulty: "Beginner",
        readingTime: "3 min",
        module: "Field Catalog",
        icon: Database,
        content: [
          "Field Catalog is where the field vocabulary itself lives: every field usable in a Rule Builder condition or the Simulator's dynamic input form is defined here first, with its data type (number, currency, enum, boolean...) and which domain it applies to.",
          "Tagging a field to an Entity Catalog entity groups it into that entity's section in Rule Builder's attribute panel — untagged fields fall into a catch-all \"Other\" bucket.",
          "A field's \"Used By\" count shows how many rules currently reference it — deleting a field that's still referenced is blocked, so a rule is never left pointing at a field that no longer exists.",
        ],
      },
      {
        id: "cf-7",
        title: "JSON Mapping",
        description: "Map incoming/outgoing API JSON attributes to internal BRE fields — the foundation for integrating a real source system.",
        difficulty: "Intermediate",
        readingTime: "4 min",
        module: "JSON Mapping",
        icon: FileJson,
        content: [
          "JSON Mapping translates between an external system's JSON shape and the platform's own internal field names, so a real source system's payload format never has to match the BRE's field vocabulary exactly.",
          "Build a mapping set from a pasted or uploaded sample payload — each attribute gets matched to (or created as) an internal field, in either direction: incoming request or outgoing response.",
          "This is the layer a real integration is built on top of — the Simulator's own request/response envelope already reflects the live field vocabulary, and JSON Mapping is what connects that vocabulary to an actual external system's format.",
        ],
      },
      {
        id: "cf-8",
        title: "Dashboard Management",
        description: "Configure which page each role lands on after sign-in, and their default KPI cards, quick actions and widgets.",
        difficulty: "Intermediate",
        readingTime: "3 min",
        module: "Dashboard Management",
        icon: LayoutDashboard,
        content: [
          "Every role has its own Dashboard defaults: which KPI cards appear, which Quick Actions show, which widgets are visible, and — most importantly — its Landing Route, the page a user is dropped onto right after signing in or switching roles.",
          "This is what lets each role's starting point match what that role actually does — an Underwriter might land straight on Rule Simulator instead of the generic Dashboard, since that's the tool they use most.",
          "Changes here take effect the next time that role signs in or switches — an already-signed-in session doesn't retroactively jump anywhere.",
        ],
      },
      {
        id: "cf-9",
        title: "Product Access",
        description: "Configure which products each existing role can see across Products Hub and Rule Simulator.",
        difficulty: "Intermediate",
        readingTime: "3 min",
        module: "Product Access",
        icon: KeyRound,
        content: [
          "Product Access controls which products a role can see in the Products Hub and Rule Simulator's product picker — by default every role sees every product, until an admin explicitly restricts one.",
          "Roles themselves are read-only here — this page only manages product visibility, not role definitions, capabilities, or permissions.",
          "It doesn't affect Product Master or Product–Rule Mapping — those stay fully visible to anyone with configuration access, so an admin can never be locked out of managing a product they can't otherwise \"see.\"",
        ],
      },
      {
        id: "cf-10",
        title: "NotifyX",
        description: "Automate reminders, escalations, and notifications with trigger → condition → action workflows.",
        difficulty: "Intermediate",
        readingTime: "4 min",
        module: "NotifyX",
        icon: Workflow,
        content: [
          "NotifyX automates notifications without writing code: pick a trigger (a rule reaching Testing, an approval sitting pending too long), an optional condition, and an action — an email, an in-app notification, or an escalation.",
          "It's built for exactly the kind of thing that's easy to forget manually: reminding a checker about a pending approval, or escalating a rule that's been sitting in Draft too long.",
          "Workflows are reusable templates — build one once and apply it to multiple trigger conditions, and every notification sent stays traceable back to the workflow that produced it.",
        ],
      },
    ],
  },
  {
    id: "best-practices",
    label: "Best Practices",
    icon: Gauge,
    guides: [
      {
        id: "bp-1",
        title: "Enterprise Rule Design",
        description: "Structuring rules so they scale cleanly as the catalog grows.",
        difficulty: "Advanced",
        readingTime: "5 min",
        module: "Rule Builder",
        icon: Building2,
        content: [
          "Keep each rule focused on one decision — chain several focused rules together rather than building one rule that tries to evaluate everything at once.",
          "Favor a Decision Matrix lookup over a hardcoded threshold for anything that changes with market or pricing conditions, so tuning it later doesn't require touching rule logic.",
          "Design with the conflict detector in mind: two Active rules that can both fire with opposing outcomes on the same field is a design smell worth resolving at the source, not just clearing the warning.",
        ],
      },
      {
        id: "bp-2",
        title: "Performance Best Practices",
        description: "Keeping large rule sets fast to evaluate and easy to maintain.",
        difficulty: "Advanced",
        readingTime: "5 min",
        module: "Rule Builder",
        icon: Gauge,
        content: [
          "Keep a product's mapped rule set as short as the decision actually requires — every mapped rule runs on every simulation for that product.",
          "Order rules so cheap, high-rejection checks (basic eligibility, for instance) run before expensive lookups, so a clear rejection short-circuits the rest of the work early.",
          "Separate rarely-changing logic from frequently-tuned thresholds — put the latter in a Decision Matrix so adjusting it doesn't require republishing a rule.",
        ],
      },
      {
        id: "bp-3",
        title: "Naming Standards",
        description: "Consistent IDs and names that stay legible at hundreds of rules.",
        difficulty: "Beginner",
        readingTime: "2 min",
        module: "Rule Builder",
        icon: Tag,
        content: [
          "Use a consistent ID scheme and a name that states the decision, not the mechanism — \"Minimum Credit Score Validation\" tells you something; \"Rule 47\" doesn't.",
          "Consistent naming is what actually makes Rule Repository's search and a product's Execution Plan scannable once you're past a handful of rules and into the hundreds.",
          "Avoid reusing a retired rule's ID for something unrelated — versioning and the audit trail both assume an ID means the same thing across its entire lifecycle.",
        ],
      },
      {
        id: "bp-4",
        title: "Common Mistakes",
        description: "The conflicts and gaps this platform's own tools are built to catch.",
        difficulty: "Intermediate",
        readingTime: "4 min",
        module: "Rule Builder",
        icon: AlertTriangle,
        content: [
          "Publishing straight to Active without a sandbox test first — skipping the one step that would have surfaced a chaining or boundary bug before it reached production.",
          "Hardcoding a threshold that should be a Decision Matrix lookup, which turns a routine pricing change into a rule redeploy instead of a simple config edit.",
          "Dismissing a \"Possible conflict\" flag without checking whether it's a genuine overlap or two rules that merely share a field while actually being mutually exclusive.",
        ],
      },
      {
        id: "bp-5",
        title: "Production Checklist",
        description: "What to verify before publishing a rule to a live product.",
        difficulty: "Advanced",
        readingTime: "5 min",
        module: "Rule Repository",
        icon: ListChecks,
        content: [
          "Sandbox-tested with realistic inputs, including boundary values — exactly at a threshold, not just comfortably inside or outside it.",
          "Reviewed and approved by someone other than the author, with the reviewer's reasoning captured as part of the maker-checker record.",
          "Checked against Rule Repository's conflict flags for its domain, and confirmed the mapped product's Execution Plan sequence is what you actually intend before publishing.",
        ],
      },
    ],
  },
];

const DIFFICULTY_STYLES: Record<GuideDifficulty, string> = {
  Beginner: "bg-emerald-100 text-emerald-700",
  Intermediate: "bg-amber-100 text-amber-700",
  Advanced: "bg-violet-100 text-violet-700",
};

const PIN_STORAGE_KEY = "bre-help-pinned-guides";

// Lets the BRE Assistant chatbot deep-link straight to the guide it answered
// from, instead of just gesturing at "see Help & Support." A window event
// (not a Zustand store field) because this is transient UI coordination
// between two independent widgets, not app state worth persisting.
export const OPEN_GUIDE_EVENT = "bre-open-guide";
export interface OpenGuideDetail {
  guideId: string;
  /** Reuses the existing search box so the guide surfaces in the flat,
   *  always-visible search-results view — no need to also track/force-open
   *  the right accordion category. */
  searchTerm: string;
}

function GuideCard({
  guide,
  pinned,
  expanded,
  onTogglePin,
  onToggleExpand,
  onOpen,
}: {
  guide: Guide;
  pinned: boolean;
  expanded: boolean;
  onTogglePin: () => void;
  onToggleExpand: () => void;
  onOpen: () => void;
}) {
  const hasContent = !!guide.content?.length;
  return (
    <div
      className={cn(
        "rounded-lg border p-2.5 transition-colors hover:border-primary/30 hover:bg-accent/30",
        expanded && "border-primary/30 bg-accent/20"
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <guide.icon className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1.5">
            <p className="text-sm font-medium leading-snug text-foreground">{guide.title}</p>
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label={pinned ? `Unpin ${guide.title}` : `Pin ${guide.title}`}
                onClick={onTogglePin}
              >
                <Pin className={cn("size-3.5", pinned ? "fill-primary text-primary" : "text-muted-foreground")} />
              </Button>
              {hasContent ? (
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label={expanded ? `Collapse ${guide.title}` : `Open ${guide.title} guide`}
                  aria-expanded={expanded}
                  onClick={onToggleExpand}
                >
                  <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", expanded && "rotate-180")} />
                </Button>
              ) : (
                <Button size="icon-xs" variant="ghost" aria-label={`Open ${guide.title} guide`} onClick={onOpen}>
                  <ExternalLink className="size-3.5 text-muted-foreground" />
                </Button>
              )}
            </div>
          </div>
          <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{guide.description}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge className={cn("border-0 px-1.5 text-sm", DIFFICULTY_STYLES[guide.difficulty])}>{guide.difficulty}</Badge>
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="size-2.5" /> {guide.readingTime}
            </span>
            <Badge className="border-0 bg-blue-50 px-1.5 text-sm text-blue-700">{guide.module}</Badge>
          </div>
          {expanded && hasContent && (
            <div className="mt-2.5 space-y-2 border-t pt-2.5">
              {guide.content!.map((paragraph, i) => (
                <p key={i} className="text-sm leading-relaxed text-foreground/80">
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function HelpDesk() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [expandedGuideId, setExpandedGuideId] = useState<string | null>(null);

  const toggleExpand = (id: string) => setExpandedGuideId((prev) => (prev === id ? null : id));

  // Lets the chatbot open this panel straight to the guide it just answered
  // from — see OPEN_GUIDE_EVENT above.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<OpenGuideDetail>).detail;
      if (!detail) return;
      setOpen(true);
      setQuery(detail.searchTerm);
      setExpandedGuideId(detail.guideId);
    };
    window.addEventListener(OPEN_GUIDE_EVENT, handler);
    return () => window.removeEventListener(OPEN_GUIDE_EVENT, handler);
  }, []);

  // Pinning is a lightweight, self-contained "future-ready" affordance — it
  // lives in its own localStorage key, not the app's Zustand store, so it
  // can't collide with a real persisted-state migration later.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PIN_STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setPinnedIds(JSON.parse(raw));
    } catch {
      // Ignore malformed/unavailable storage — pinning just starts empty.
    }
  }, []);

  const togglePin = (id: string) => {
    setPinnedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id];
      try {
        localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore write failures (e.g. storage disabled) — state still updates in-session.
      }
      return next;
    });
  };

  const allGuides = useMemo(() => GUIDE_CATEGORIES.flatMap((c) => c.guides), []);
  const totalGuideCount = allGuides.length;
  const pinnedGuides = allGuides.filter((g) => pinnedIds.includes(g.id));

  const normalizedQuery = query.trim().toLowerCase();
  const filteredCategories = useMemo(() => {
    if (!normalizedQuery) return GUIDE_CATEGORIES;
    return GUIDE_CATEGORIES.map((cat) => ({
      ...cat,
      guides: cat.guides.filter(
        (g) =>
          g.title.toLowerCase().includes(normalizedQuery) ||
          g.description.toLowerCase().includes(normalizedQuery) ||
          g.module.toLowerCase().includes(normalizedQuery)
      ),
    })).filter((cat) => cat.guides.length > 0);
  }, [normalizedQuery]);

  const handleOpenGuide = (title: string) => {
    toast.info(`"${title}" guide coming soon`, { description: "This Knowledge Center entry is being written." });
  };

  return (
    <>
      <Button variant="ghost" size="icon" className="size-9" onClick={() => setOpen(true)} aria-label="Help">
        <HelpCircle className="size-[18px]" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Help &amp; Support</SheetTitle>
            <SheetDescription>Reach the BRE platform team or browse the Knowledge Center.</SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
            <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Phone className="size-4 text-muted-foreground" />
                <a href="tel:+912261427788" className="hover:underline">
                  +91 22 6142 7788
                </a>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Mail className="size-4 text-muted-foreground" />
                <a href="mailto:bre-support@qualtechedge.com" className="hover:underline">
                  bre-support@qualtechedge.com
                </a>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="size-4 text-muted-foreground" />
                <span>Mon – Sat, 9:00 AM – 8:00 PM IST</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <BookOpen className="size-3.5" /> Knowledge Center
                </p>
                <span className="text-sm text-muted-foreground">{totalGuideCount} guides</span>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search guides..."
                  className="h-8 pl-8 text-sm"
                  aria-label="Search guides"
                />
              </div>

              {!normalizedQuery && pinnedGuides.length > 0 && (
                <div className="space-y-1.5">
                  <p className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <Pin className="size-3 fill-current" /> Pinned
                  </p>
                  <div className="space-y-1.5">
                    {pinnedGuides.map((g) => (
                      <GuideCard
                        key={g.id}
                        guide={g}
                        pinned
                        expanded={expandedGuideId === g.id}
                        onTogglePin={() => togglePin(g.id)}
                        onToggleExpand={() => toggleExpand(g.id)}
                        onOpen={() => handleOpenGuide(g.title)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {filteredCategories.length === 0 ? (
                <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                  No guides match &quot;{query}&quot;.
                </p>
              ) : normalizedQuery ? (
                <div className="space-y-3">
                  {filteredCategories.map((cat) => (
                    <div key={cat.id} className="space-y-1.5">
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                        <cat.icon className="size-3 text-primary" /> {cat.label}
                      </p>
                      <div className="space-y-1.5">
                        {cat.guides.map((g) => (
                          <GuideCard
                            key={g.id}
                            guide={g}
                            pinned={pinnedIds.includes(g.id)}
                            expanded={expandedGuideId === g.id}
                            onTogglePin={() => togglePin(g.id)}
                            onToggleExpand={() => toggleExpand(g.id)}
                            onOpen={() => handleOpenGuide(g.title)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Accordion>
                  {filteredCategories.map((cat) => (
                    <AccordionItem key={cat.id} value={cat.id}>
                      <AccordionTrigger className="text-sm">
                        <span className="flex items-center gap-2">
                          <cat.icon className="size-3.5 text-primary" />
                          {cat.label}
                          <span className="text-sm font-normal text-muted-foreground">({cat.guides.length})</span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-1.5">
                          {cat.guides.map((g) => (
                            <GuideCard
                            key={g.id}
                            guide={g}
                            pinned={pinnedIds.includes(g.id)}
                            expanded={expandedGuideId === g.id}
                            onTogglePin={() => togglePin(g.id)}
                            onToggleExpand={() => toggleExpand(g.id)}
                            onOpen={() => handleOpenGuide(g.title)}
                          />
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>

            <Button render={<a href="mailto:bre-support@qualtechedge.com" />} nativeButton={false} className="mt-2">
              <Mail className="size-4" /> Email Support
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
