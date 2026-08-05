import { Capability } from "./types";

// Shared between Roles (capability templates) and Users (per-person System
// Permissions) — one list so the two checkbox sets never drift apart.
export const ALL_CAPABILITIES: Capability[] = [
  "rule.view",
  "rule.create",
  "rule.edit",
  "rule.delete",
  "rule.simulate",
  "rule.publish",
  "system.manage",
  "config.manage",
  "notifyx.view",
  "notifyx.create",
  "notifyx.edit",
  "notifyx.toggle",
];

// Display text only — the underlying Capability id ("rule.publish") and every
// hasCapability(...) check elsewhere stay unchanged.
const CAPABILITY_LABELS: Partial<Record<Capability, string>> = {
  "rule.publish": "rule.approve",
};

export const capabilityLabel = (cap: Capability) => CAPABILITY_LABELS[cap] ?? cap;

// The subset of Capability that's meaningful scoped to a single rule
// category — used by User Access Mapping's per-user/per-product/per-category
// System Permissions. system.manage, config.manage and notifyx.* apply
// platform-wide regardless of category, so they're deliberately excluded
// here and stay on AppUser.permissions instead.
export const CATEGORY_SCOPABLE_CAPABILITIES: Capability[] = [
  "rule.view",
  "rule.create",
  "rule.edit",
  "rule.delete",
  "rule.simulate",
  "rule.publish",
];

// Named access levels for the User Access Mapping dialog's quick-set buttons.
// Presentation only — a mapping still stores the granular Capability[] below,
// which is strictly MORE expressive than a Read/Write flag (Maker-Checker
// depends on rule.publish specifically). These are shortcuts for the common
// combinations, not a separate permission model.
export const PERMISSION_PRESETS: { label: string; description: string; capabilities: Capability[] }[] = [
  { label: "Read", description: "View rules only", capabilities: ["rule.view"] },
  { label: "Write", description: "View, create and edit rules", capabilities: ["rule.view", "rule.create", "rule.edit"] },
  { label: "Approve", description: "View and approve rules (Checker)", capabilities: ["rule.view", "rule.publish"] },
  { label: "Execute", description: "View and run simulations", capabilities: ["rule.view", "rule.simulate"] },
];
