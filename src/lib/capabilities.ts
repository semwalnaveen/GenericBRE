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
