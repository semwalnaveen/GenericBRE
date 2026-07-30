"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  ALL_RULES,
  AUDIT_LOG,
  DEFAULT_APPROVAL_REQUESTS,
  DEFAULT_NOTIFY_CATEGORIES,
  DEFAULT_NOTIFY_TRIGGERS,
  DEFAULT_NOTIFY_WORKFLOWS,
  DEFAULT_NOTIFY_WORKFLOW_TEMPLATES,
  DEFAULT_JOB_TITLES,
  DEFAULT_USER_ACCESS_MAPPINGS,
  DEFAULT_JSON_MAPPINGS,
  DEFAULT_APPLICATIONS,
  DEFAULT_PRODUCTS,
  DEFAULT_PRODUCT_RULE_MAPPINGS,
  DEFAULT_RULE_GROUPS,
  DEFAULT_RULE_TEMPLATES,
  DEFAULT_SIMULATIONS,
  DEFAULT_USERS,
  MATRICES,
} from "./mock-data";
import {
  AppUser,
  AppearanceSettings,
  ApprovalRequest,
  AuditEntry,
  BatchRunSummary,
  BusinessField,
  BusinessRule,
  LoanApplication,
  Capability,
  ColorMode,
  CurrentUser,
  DashboardConfig,
  DashboardWidgetLayoutState,
  DecisionMatrix,
  DecisionResponseConfig,
  Domain,
  Entity,
  ExecutionSettings,
  Industry,
  JobTitle,
  JsonMapping,
  NotifyCategory,
  NotifyTrigger,
  NotifyWorkflow,
  NotifyWorkflowTemplate,
  Priority,
  Product,
  ProductRuleMapping,
  UserProductAccess,
  RuleCategory,
  MatrixRow,
  // RuleEnvironment, // FUTURE: restore when environment promotion is reintroduced
  RuleGroup,
  RuleStatus,
  RuleTemplate,
  RuleVersion,
  SimulationResult,
} from "./types";
import { DEFAULT_INDUSTRIES } from "./industries";
import { DEFAULT_ENTITIES } from "./entities";
import { DEFAULT_FIELD_CATALOG, DEFAULT_RULE_CATEGORIES, DEFAULT_OWNERS } from "./fields";
import { DEFAULT_DASHBOARD_CONFIGS } from "./dashboards";
// DEFAULT_REQUEST_PARAMETER_DEFS import removed — Execution Manager deleted
import { DEFAULT_DECISION_RESPONSE_CONFIG } from "./decision-response";
import { hashAuditEntry, buildHashChain } from "./audit-chain";
import { ALL_CAPABILITIES, CATEGORY_SCOPABLE_CAPABILITIES } from "./capabilities";

// The config/admin capabilities — everything that isn't a category-scopable
// rule.* action. Granted only to Administrators (AppUser.isAdmin); never
// assignable per product/category.
const ADMIN_CAPABILITIES: Capability[] = ALL_CAPABILITIES.filter(
  (c) => !CATEGORY_SCOPABLE_CAPABILITIES.includes(c)
);

export type {
  ThemePreset,
  ColorMode,
  DensityMode,
  FontScale,
  CustomColors,
  BackgroundPrefs,
  BackgroundTarget,
  BackgroundDisplayMode,
  AppearanceSettings,
} from "./types";

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  preset: "client",
  colorMode: "light",
  customColors: {},
  background: {
    imageData: null,
    target: "app",
    displayMode: "cover",
    opacity: 20,
    blur: 8,
    brightness: 100,
    dimOverlay: 0,
  },
  density: "compact",
  fontScale: "md",
  highContrast: false,
  largeClickTargets: false,
  showInsights: true,
  logo: null,
  appName: "Business Rules Engine",
  tagline: "Decision Platform",
  language: "en",
};

function snapshotFromRule(
  rule: BusinessRule,
  snapshotBy: string,
  changeType: RuleVersion["changeType"],
  restoredFromVersion?: number
): RuleVersion {
  return {
    ruleId: rule.id,
    version: rule.version,
    snapshotAt: rule.updatedAt,
    snapshotBy,
    changeType,
    restoredFromVersion,
    name: rule.name,
    category: rule.category,
    subCategory: rule.subCategory,
    groupId: rule.groupId,
    sequence: rule.sequence,
    priority: rule.priority,
    owner: rule.owner,
    description: rule.description,
    rootGroup: rule.rootGroup,
    actions: rule.actions,
    elseActions: rule.elseActions,
  };
}

const DEFAULT_USER: CurrentUser = { userId: "usr-ananya-verma", name: "Ananya Verma", role: "Business Analyst", initials: "AV" };

// Caps in-browser audit history so a long-running demo session can't grow
// auditLog (persisted whole into one localStorage key) past the origin's
// storage quota — see logAudit. A real deployment moves this to backend,
// paginated storage instead of a client-side cap.
const AUDIT_LOG_CAP = 500;

// Status was dropped — it was set by the header's filter UI but never read
// by any page (only `domains` is consumed, and only by the Dashboard).
export interface GlobalFilters {
  domains: Domain[];
}

const DEFAULT_GLOBAL_FILTERS: GlobalFilters = { domains: [] };

interface AppState {
  rules: BusinessRule[];
  matrices: DecisionMatrix[];
  auditLog: AuditEntry[];
  simulations: SimulationResult[];
  /** Batch Testing run history — summaries only, see BatchRunSummary. */
  batchRuns: BatchRunSummary[];
  addBatchRunSummary: (summary: Omit<BatchRunSummary, "id">) => string;
  markBatchReportDownloaded: (id: string) => void;
  /** Seed customer applications for the Simulator's Application-ID mode (see LoanApplication). */
  applications: LoanApplication[];
  appearance: AppearanceSettings;
  appearanceOpen: boolean;
  setAppearanceOpen: (open: boolean) => void;
  // generic, per-user/per-device dashboard customization — see
  // src/lib/dashboard-layout.ts's useDashboardLayout, keyed by dashboardKey
  // so any dashboard-style page can plug in its own widget catalog.
  dashboardLayouts: Record<string, DashboardWidgetLayoutState[]>;
  setDashboardLayout: (key: string, layout: DashboardWidgetLayoutState[]) => void;
  resetDashboardLayout: (key: string) => void;
  dashboardConfigs: Record<string, DashboardConfig>;
  setDashboardConfig: (userId: string, config: DashboardConfig) => void;
  currentUser: CurrentUser;
  sidebarCollapsed: boolean;
  // Separate from sidebarCollapsed above (the global app-shell rail) — this
  // is Configuration Studio's own section nav, collapsed/expanded and
  // persisted independently.
  configStudioNavCollapsed: boolean;
  setConfigStudioNavCollapsed: (collapsed: boolean) => void;
  globalFilters: GlobalFilters;
  setGlobalFilters: (patch: Partial<GlobalFilters>) => void;
  resetGlobalFilters: () => void;

  // session — client-side only (no backend). `hasHydrated` tells consumers
  // (route guards) when the persisted value of `isAuthenticated` is actually
  // trustworthy, so we never bounce a real session to /login on first paint.
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  login: () => void;
  loginAsUser: (userId: string) => void;
  logout: () => void;

  // configuration studio — the "no hardcoding" layer. Every industry/vertical,
  // business field, category and owner in the app is data here, not code.
  industries: Industry[];
  entities: Entity[];
  fieldCatalog: BusinessField[];
  ruleCategories: RuleCategory[];
  owners: string[];
  addIndustry: (industry: Industry) => void;
  updateIndustry: (id: string, patch: Partial<Industry>) => void;
  deleteIndustry: (id: string) => void;
  addEntity: (entity: Entity) => void;
  updateEntity: (id: string, patch: Partial<Entity>) => void;
  deleteEntity: (id: string) => void;
  addField: (field: BusinessField) => void;
  updateField: (key: string, patch: Partial<BusinessField>) => void;
  deleteField: (key: string) => void;
  addRuleCategory: (category: RuleCategory) => void;
  updateRuleCategory: (id: string, patch: Partial<RuleCategory>) => void;
  deleteRuleCategory: (id: string) => void;
  addOwner: (name: string) => void;
  deleteOwner: (name: string) => void;

  // per-industry (or "default") conflict-resolution strategy — read by
  // runSimulation to decide execution order / stop-on-first-match.
  executionSettings: Record<string, ExecutionSettings>;
  setExecutionSettings: (scope: string, settings: ExecutionSettings) => void;

  // foundational JSON Mapping — named, reusable attribute-to-field mapping sets.
  jsonMappings: JsonMapping[];
  addJsonMapping: (mapping: JsonMapping) => void;
  updateJsonMapping: (id: string, patch: Partial<JsonMapping>) => void;
  deleteJsonMapping: (id: string) => void;

  // Execution Manager removed (requestParameterDefs and ruleExecutionMappings removed)

  // Decision Result module — per-scope ("default" | Industry.id |
  // RuleExecutionMapping.id) configuration of how much detail a decision
  // result exposes. Read by decisionResponse.resolveDecisionResponseConfig.
  decisionResponseSettings: Record<string, DecisionResponseConfig>;
  setDecisionResponseConfig: (scope: string, config: DecisionResponseConfig) => void;

  // Job Titles & Permissions — a reusable named-title catalog (see JobTitle
  // in types.ts) that populates the Job Title dropdown in Add/Edit User.
  // addJobTitle returns ok:false on a duplicate name (case-insensitive),
  // matching addUserAccessMapping's result-object convention.
  jobTitles: JobTitle[];
  addJobTitle: (jobTitle: { name: string }) => { ok: boolean; reason?: string };
  updateJobTitle: (id: string, patch: Partial<JobTitle>) => void;
  deleteJobTitle: (id: string) => void;

  // user roster — named individuals. The single source of truth for access:
  // isAdmin grants config/admin caps, UserProductAccess rows grant rule.*
  // caps, and approvalCategories drive Maker-Checker.
  users: AppUser[];
  addUser: (user: AppUser) => void;
  updateUser: (id: string, patch: Partial<AppUser>) => void;
  deleteUser: (id: string) => void;

  // User Access Mapping — per-user, per-Product, per-Category System
  // Permissions (see UserProductAccess in types.ts). addUserAccessMapping
  // returns ok:false with a message on a duplicate (userId+productId+categoryId)
  // instead of throwing, matching submitForReview/approveRule's result-object
  // convention elsewhere in this store.
  userAccessMappings: UserProductAccess[];
  addUserAccessMapping: (mapping: {
    userId: string;
    productId: string;
    categoryId: string;
    capabilities: Capability[];
  }) => { ok: boolean; reason?: string };
  updateUserAccessMapping: (id: string, patch: Partial<UserProductAccess>) => void;
  deleteUserAccessMapping: (id: string) => void;

  // rule groups (organizational collections, independent of Category)
  ruleGroups: RuleGroup[];
  addRuleGroup: (group: RuleGroup) => void;
  updateRuleGroup: (id: string, patch: Partial<RuleGroup>) => void;
  deleteRuleGroup: (id: string) => void;

  // Product Master + Product-Rule Mapping — replaces Execution Manager's
  // group/mapping routing. A Product is a configurable named scheme; which
  // rules apply to it is entirely data (ProductRuleMapping), not code.
  products: Product[];
  addProduct: (product: Product) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  /** Sets publishStatus="Published" + lastPublishedAt (see Product Workspace's guided Stepper). Maker-Checker parity with rules: blocks the same person who last edited the product's overview from being the one to publish it. */
  publishProduct: (id: string) => { ok: boolean; reason?: string };
  /** Hard delete — only permitted when the product has zero rule mappings and zero simulation history, so referential integrity (mappings/simulations/audit trail) can never be silently broken. A product with any history must be Deactivated instead (see updateProduct/status). */
  deleteProduct: (id: string) => { ok: boolean; reason?: string };
  productRuleMappings: ProductRuleMapping[];
  // Full-replace semantics for a given product — simplest correct behavior
  // for a checklist-style mapping UI (see product-rule-mapping-manager.tsx).
  saveProductRuleMapping: (productId: string, ruleIds: string[]) => void;

  // Rule Simulator's "Recently Used" quick-access list — most-recent-first,
  // capped at 5. Recorded on an actual simulation run (see useRunSimulator's
  // runScenario), not just on selecting a product in the picker.
  recentProductIds: string[];
  recordRecentProduct: (id: string) => void;

  // NotifyX — trigger -> condition -> action workflow automation (config-only
  // prototype, no execution engine). Categories/Triggers are configurable
  // registries; see src/components/studio/notify-x-manager.tsx.
  notifyCategories: NotifyCategory[];
  notifyTriggers: NotifyTrigger[];
  notifyWorkflows: NotifyWorkflow[];
  notifyWorkflowTemplates: NotifyWorkflowTemplate[];
  addNotifyWorkflow: (workflow: NotifyWorkflow) => void;
  updateNotifyWorkflow: (id: string, patch: Partial<NotifyWorkflow>) => void;
  deleteNotifyWorkflow: (id: string) => void;
  toggleNotifyWorkflowStatus: (id: string) => void;
  cloneNotifyWorkflow: (id: string) => void;
  importNotifyWorkflowTemplate: (templateId: string) => void;

  // rule templates (reusable starting shapes for the Rule Builder)
  ruleTemplates: RuleTemplate[];
  addRuleTemplate: (template: RuleTemplate) => void;
  updateRuleTemplate: (id: string, patch: Partial<RuleTemplate>) => void;
  deleteRuleTemplate: (id: string) => void;

  // approval workflow (BRD §5.5 governance: Draft -> Testing -> Review -> Publish)
  approvalRequests: ApprovalRequest[];
  // Every rule-mutation action below is enforced inside the store itself, not
  // just via a UI-level disabled button: each returns { ok: false, reason }
  // instead of silently succeeding when the caller lacks the required
  // capability (or, for approveRule, is the same person who submitted the
  // rule for review — maker-checker).
  submitForReview: (ruleId: string) => { ok: boolean; reason?: string };
  approveRule: (ruleId: string) => { ok: boolean; reason?: string };
  rejectRule: (ruleId: string, comment?: string) => { ok: boolean; reason?: string };
  publishRule: (ruleId: string) => { ok: boolean; reason?: string };
  mapRuleToProducts: (
    ruleId: string,
    config: {
      productIds: string[];
      categoryId?: string;
      priority?: Priority;
      sequence?: number;
      effectiveDate?: string;
      remarks?: string;
    }
  ) => { ok: boolean; reason?: string };

  // FUTURE: promoteRuleEnvironment removed for demo. Restore when environment promotion is reintroduced.
  // promoteRuleEnvironment: (ruleId: string) => { ok: boolean; reason?: string };

  // rules
  addRule: (rule: BusinessRule) => { ok: boolean; reason?: string };
  updateRule: (id: string, updater: (r: BusinessRule) => BusinessRule) => { ok: boolean; reason?: string };
  setRuleStatus: (id: string, status: RuleStatus) => { ok: boolean; reason?: string };
  cloneRule: (id: string) => { ok: boolean; reason?: string; newId?: string };
  archiveRule: (id: string) => { ok: boolean; reason?: string };
  deleteRule: (id: string) => { ok: boolean; reason?: string };

  // version history — a full content snapshot per edit (see RuleVersion),
  // not just the bare counter. addRule/updateRule append automatically;
  // restoreRuleVersion re-applies an older snapshot's content as a new version.
  ruleVersions: RuleVersion[];
  restoreRuleVersion: (ruleId: string, version: number) => { ok: boolean; reason?: string };

  // matrices
  addMatrix: (matrix: DecisionMatrix) => void;
  deleteMatrix: (matrixId: string) => void;
  updateMatrixRows: (matrixId: string, rows: MatrixRow[]) => void;
  addMatrixRow: (matrixId: string, row: MatrixRow) => void;
  updateMatrixRow: (matrixId: string, rowId: string, values: MatrixRow["values"]) => void;
  deleteMatrixRow: (matrixId: string, rowId: string) => void;
  duplicateMatrixRow: (matrixId: string, rowId: string) => void;

  // simulations
  addSimulation: (result: SimulationResult) => void;

  // audit
  logAudit: (entry: Omit<AuditEntry, "id" | "timestamp" | "prevHash" | "hash">) => void;

  // appearance
  setAppearance: (patch: Partial<AppearanceSettings>) => void;
  resetAppearance: () => void;

  // user
  setSidebarCollapsed: (collapsed: boolean) => void;
}

// Collision-safe rule id: derive from the live rule set (max numeric id + 1)
// rather than a module counter, which resets to a fixed value on every reload
// and would re-mint ids that already exist in the persisted store — the root
// cause of duplicate rule ids (e.g. two RL-901s after cloning across sessions).
function nextRuleIdFor(rules: BusinessRule[]): string {
  const existing = new Set(rules.map((r) => r.id));
  const nums = rules.map((r) => parseInt(r.id.replace(/\D/g, ""), 10)).filter((n) => !Number.isNaN(n));
  let n = (nums.length ? Math.max(...nums) : 900) + 1;
  let id = `RL-${n}`;
  while (existing.has(id)) {
    n += 1;
    id = `RL-${n}`;
  }
  return id;
}

let matrixRowSeq = 900;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      rules: ALL_RULES,
      matrices: MATRICES,
      auditLog: AUDIT_LOG,
      simulations: DEFAULT_SIMULATIONS,
      batchRuns: [],
      applications: DEFAULT_APPLICATIONS,
      appearance: DEFAULT_APPEARANCE,
      appearanceOpen: false,
      dashboardLayouts: {},
      currentUser: DEFAULT_USER,
      sidebarCollapsed: false,
      configStudioNavCollapsed: false,
      globalFilters: DEFAULT_GLOBAL_FILTERS,
      setGlobalFilters: (patch) => set((s) => ({ globalFilters: { ...s.globalFilters, ...patch } })),
      resetGlobalFilters: () => set({ globalFilters: DEFAULT_GLOBAL_FILTERS }),

      isAuthenticated: false,
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),
      login: () => {
        set({ isAuthenticated: true });
        const { name, role } = get().currentUser;
        get().logAudit({ user: name, action: "Signed In", entity: "Session", entityId: role, details: `${name} signed in.` });
      },
      // "Logs in" as a specific person from the User roster — Demo Mode picks
      // a named user (not a role/persona), and access resolves from that
      // user's isAdmin flag + their UserProductAccess rows.
      loginAsUser: (userId) => {
        const user = get().users.find((u) => u.id === userId);
        if (!user) return;
        const initials = user.name.split(/[\s/]+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
        set({
          isAuthenticated: true,
          currentUser: { userId: user.id, name: user.name, role: user.role, initials },
        });
        get().logAudit({ user: user.name, action: "Signed In", entity: "Session", entityId: user.id, details: `${user.name} signed in.` });
      },
      logout: () => {
        get().logAudit({ user: get().currentUser.name, action: "Signed Out", entity: "Session", entityId: get().currentUser.role, details: `${get().currentUser.name} signed out.` });
        set({ isAuthenticated: false });
      },

      industries: DEFAULT_INDUSTRIES,
      entities: DEFAULT_ENTITIES,
      fieldCatalog: DEFAULT_FIELD_CATALOG,
      ruleCategories: DEFAULT_RULE_CATEGORIES,
      owners: DEFAULT_OWNERS,
      executionSettings: {},
      jsonMappings: DEFAULT_JSON_MAPPINGS,
      // Execution Manager state removed
      decisionResponseSettings: { default: DEFAULT_DECISION_RESPONSE_CONFIG },

      addIndustry: (industry) => {
        if (!can(get(), "config.manage")) return;
        set((s) => ({ industries: [...s.industries, industry] }));
        get().logAudit({ user: get().currentUser.name, action: "Created Industry", entity: "Industry", entityId: industry.id, details: `Added "${industry.name}" as a new configurable industry.` });
      },
      updateIndustry: (id, patch) => {
        if (!can(get(), "config.manage")) return;
        set((s) => ({ industries: s.industries.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
        get().logAudit({ user: get().currentUser.name, action: "Updated Industry", entity: "Industry", entityId: id, details: `Industry "${id}" updated.` });
      },
      deleteIndustry: (id) => {
        if (!can(get(), "config.manage")) return;
        set((s) => ({ industries: s.industries.filter((i) => i.id !== id) }));
        get().logAudit({ user: get().currentUser.name, action: "Deleted Industry", entity: "Industry", entityId: id, details: `Industry "${id}" removed.` });
      },

      addEntity: (entity) => {
        if (!can(get(), "config.manage")) return;
        set((s) => ({ entities: [...s.entities, entity] }));
        get().logAudit({ user: get().currentUser.name, action: "Created Entity", entity: "Entity", entityId: entity.id, details: `Added entity "${entity.name}" to the catalog.` });
      },
      updateEntity: (id, patch) => {
        if (!can(get(), "config.manage")) return;
        set((s) => ({ entities: s.entities.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
        get().logAudit({ user: get().currentUser.name, action: "Updated Entity", entity: "Entity", entityId: id, details: `Entity "${id}" updated.` });
      },
      deleteEntity: (id) => {
        if (!can(get(), "config.manage")) return;
        set((s) => ({ entities: s.entities.filter((e) => e.id !== id) }));
        get().logAudit({ user: get().currentUser.name, action: "Deleted Entity", entity: "Entity", entityId: id, details: `Entity "${id}" removed.` });
      },

      addField: (field) => {
        const { currentUser } = get();
        if (!can(get(), "config.manage")) return;
        const stamped: BusinessField = { ...field, updatedAt: new Date().toISOString(), updatedBy: currentUser.name };
        set((s) => ({ fieldCatalog: [...s.fieldCatalog, stamped] }));
        get().logAudit({ user: get().currentUser.name, action: "Created Field", entity: "BusinessField", entityId: field.key, details: `Added field "${field.label}" to the catalog.` });
      },
      updateField: (key, patch) => {
        const { currentUser } = get();
        if (!can(get(), "config.manage")) return;
        const stampedPatch = { ...patch, updatedAt: new Date().toISOString(), updatedBy: currentUser.name };
        set((s) => ({ fieldCatalog: s.fieldCatalog.map((f) => (f.key === key ? { ...f, ...stampedPatch } : f)) }));
        get().logAudit({ user: get().currentUser.name, action: "Updated Field", entity: "BusinessField", entityId: key, details: `Field "${key}" updated.` });
      },
      deleteField: (key) => {
        if (!can(get(), "config.manage")) return;
        set((s) => ({ fieldCatalog: s.fieldCatalog.filter((f) => f.key !== key) }));
        get().logAudit({ user: get().currentUser.name, action: "Deleted Field", entity: "BusinessField", entityId: key, details: `Field "${key}" removed from the catalog.` });
      },

      addRuleCategory: (category) => {
        if (!can(get(), "config.manage")) return;
        set((s) => ({ ruleCategories: [...s.ruleCategories, category] }));
        get().logAudit({ user: get().currentUser.name, action: "Created Category", entity: "RuleCategory", entityId: category.id, details: `Added category "${category.name}".` });
      },
      updateRuleCategory: (id, patch) => {
        if (!can(get(), "config.manage")) return;
        const oldName = get().ruleCategories.find((c) => c.id === id)?.name;
        const renamed = patch.name !== undefined && oldName !== undefined && patch.name !== oldName;
        set((s) => ({
          ruleCategories: s.ruleCategories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
          // BusinessRule.category and AppUser.approvalCategories both store
          // the category's display name, not its id (audit finding A12) — a
          // rename would otherwise silently detach every rule and every
          // user's Maker-Checker approval scope still pointing at the old
          // name. Cascade the rename here instead of migrating the whole app
          // to id-based references.
          ...(renamed
            ? {
                rules: s.rules.map((r) => (r.category === oldName ? { ...r, category: patch.name! } : r)),
                users: s.users.map((u) =>
                  u.approvalCategories.includes(oldName)
                    ? { ...u, approvalCategories: u.approvalCategories.map((c) => (c === oldName ? patch.name! : c)) }
                    : u
                ),
              }
            : {}),
        }));
        get().logAudit({
          user: get().currentUser.name,
          action: "Updated Category",
          entity: "RuleCategory",
          entityId: id,
          details: renamed ? `Category renamed from "${oldName}" to "${patch.name}" — cascaded to all rules and user approval scopes.` : `Category "${id}" updated.`,
        });
      },
      deleteRuleCategory: (id) => {
        if (!can(get(), "config.manage")) return;
        set((s) => ({ ruleCategories: s.ruleCategories.filter((c) => c.id !== id) }));
        get().logAudit({ user: get().currentUser.name, action: "Deleted Category", entity: "RuleCategory", entityId: id, details: `Category "${id}" removed.` });
      },

      setExecutionSettings: (scope, settings) => {
        if (!can(get(), "config.manage")) return;
        set((s) => ({ executionSettings: { ...s.executionSettings, [scope]: settings } }));
        get().logAudit({ user: get().currentUser.name, action: "Updated Execution Settings", entity: "ExecutionSettings", entityId: scope, details: `Conflict resolution for "${scope}" set to ${settings.conflictResolution}.` });
      },

      addJsonMapping: (mapping) => {
        const { jsonMappings } = get();
        if (!can(get(), "config.manage")) return;
        // Defensive: at most one mapping per product+direction — the product-scoped
        // JSON Mapping screen only ever auto-creates when one doesn't already exist,
        // but guard here too in case another caller is added later.
        if (mapping.productId && jsonMappings.some((m) => m.productId === mapping.productId && m.direction === mapping.direction)) return;
        set((s) => ({ jsonMappings: [mapping, ...s.jsonMappings] }));
        get().logAudit({ user: get().currentUser.name, action: "Created JSON Mapping", entity: "JsonMapping", entityId: mapping.id, details: `Added mapping "${mapping.name}".` });
      },
      updateJsonMapping: (id, patch) => {
        if (!can(get(), "config.manage")) return;
        set((s) => ({ jsonMappings: s.jsonMappings.map((m) => (m.id === id ? { ...m, ...patch, updatedAt: new Date().toISOString() } : m)) }));
        get().logAudit({ user: get().currentUser.name, action: "Updated JSON Mapping", entity: "JsonMapping", entityId: id, details: `Mapping "${id}" updated.` });
      },
      deleteJsonMapping: (id) => {
        if (!can(get(), "config.manage")) return;
        set((s) => ({ jsonMappings: s.jsonMappings.filter((m) => m.id !== id) }));
        get().logAudit({ user: get().currentUser.name, action: "Deleted JSON Mapping", entity: "JsonMapping", entityId: id, details: `Mapping "${id}" removed.` });
      },

      // Execution Manager actions (add/update/delete RequestParameterDef/RuleExecutionMapping) removed

      setDecisionResponseConfig: (scope, config) => {
        const { currentUser } = get();
        if (!can(get(), "config.manage")) return;
        set((s) => ({ decisionResponseSettings: { ...s.decisionResponseSettings, [scope]: config } }));
        get().logAudit({ user: currentUser.name, action: "Updated Decision Response Config", entity: "DecisionResponseConfig", entityId: scope, details: `Decision response settings for "${scope}" updated.` });
      },

      addOwner: (name) => {
        if (!can(get(), "config.manage")) return;
        set((s) => (s.owners.includes(name) ? s : { owners: [...s.owners, name] }));
        get().logAudit({ user: get().currentUser.name, action: "Created Owner", entity: "Owner", entityId: name, details: `Added owner "${name}".` });
      },
      deleteOwner: (name) => {
        if (!can(get(), "config.manage")) return;
        set((s) => ({ owners: s.owners.filter((o) => o !== name) }));
        get().logAudit({ user: get().currentUser.name, action: "Deleted Owner", entity: "Owner", entityId: name, details: `Removed owner "${name}".` });
      },

      jobTitles: DEFAULT_JOB_TITLES,
      addJobTitle: (jobTitle) => {
        const { currentUser, jobTitles } = get();
        if (!can(get(), "config.manage")) {
          return { ok: false, reason: `${currentUser.name} doesn't have permission to manage job titles.` };
        }
        const duplicate = jobTitles.some((jt) => jt.name.trim().toLowerCase() === jobTitle.name.trim().toLowerCase());
        if (duplicate) {
          return { ok: false, reason: `A job title named "${jobTitle.name}" already exists.` };
        }
        const id = `jt-${jobTitle.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now().toString(36)}`;
        const now = new Date().toISOString();
        const entry: JobTitle = { id, name: jobTitle.name.trim(), createdAt: now, updatedAt: now };
        set((s) => ({ jobTitles: [...s.jobTitles, entry] }));
        get().logAudit({ user: currentUser.name, action: "Created Job Title", entity: "JobTitle", entityId: id, details: `Added job title "${entry.name}".` });
        return { ok: true };
      },
      updateJobTitle: (id, patch) => {
        const { currentUser } = get();
        if (!can(get(), "config.manage")) return;
        set((s) => ({
          jobTitles: s.jobTitles.map((jt) => (jt.id === id ? { ...jt, ...patch, updatedAt: new Date().toISOString() } : jt)),
        }));
        get().logAudit({ user: currentUser.name, action: "Updated Job Title", entity: "JobTitle", entityId: id, details: `Job title "${id}" updated.` });
      },
      deleteJobTitle: (id) => {
        const { currentUser, jobTitles } = get();
        if (!can(get(), "config.manage")) return;
        const existing = jobTitles.find((jt) => jt.id === id);
        set((s) => ({ jobTitles: s.jobTitles.filter((jt) => jt.id !== id) }));
        get().logAudit({ user: currentUser.name, action: "Deleted Job Title", entity: "JobTitle", entityId: id, details: `Removed job title "${existing?.name ?? id}".` });
      },

      users: DEFAULT_USERS,
      addUser: (userToAdd) => {
        if (!can(get(), "config.manage")) return;
        set((s) => ({ users: [...s.users, userToAdd] }));
        get().logAudit({ user: get().currentUser.name, action: "Created User", entity: "User", entityId: userToAdd.id, details: `Added user "${userToAdd.name}".` });
      },
      updateUser: (id, patch) => {
        if (!can(get(), "config.manage")) return;
        set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, ...patch, updatedAt: new Date().toISOString() } : u)) }));
        get().logAudit({ user: get().currentUser.name, action: "Updated User", entity: "User", entityId: id, details: `User "${id}" updated.` });
      },
      deleteUser: (id) => {
        if (!can(get(), "config.manage")) return;
        // Cascade — a deleted user's access mappings and dashboard config
        // would otherwise linger pointing at a userId nothing resolves to.
        set((s) => {
          const dashboardConfigs = { ...s.dashboardConfigs };
          delete dashboardConfigs[id];
          return {
            users: s.users.filter((u) => u.id !== id),
            userAccessMappings: s.userAccessMappings.filter((m) => m.userId !== id),
            dashboardConfigs,
          };
        });
        get().logAudit({ user: get().currentUser.name, action: "Deleted User", entity: "User", entityId: id, details: `User "${id}" removed.` });
      },

      userAccessMappings: DEFAULT_USER_ACCESS_MAPPINGS,
      addUserAccessMapping: (mapping) => {
        const { currentUser, users, products, ruleCategories, userAccessMappings } = get();
        if (!can(get(), "config.manage")) {
          return { ok: false, reason: `${currentUser.name} doesn't have permission to manage user access.` };
        }
        const duplicate = userAccessMappings.some(
          (m) => m.userId === mapping.userId && m.productId === mapping.productId && m.categoryId === mapping.categoryId
        );
        if (duplicate) {
          return { ok: false, reason: "This access already exists. Please edit the existing permission." };
        }
        const id = `uam-${Date.now().toString(36)}`;
        const now = new Date().toISOString();
        const entry: UserProductAccess = { id, ...mapping, createdBy: currentUser.name, createdAt: now, status: "Active" };
        set((s) => ({ userAccessMappings: [entry, ...s.userAccessMappings] }));
        const userName = users.find((u) => u.id === mapping.userId)?.name ?? mapping.userId;
        const productName = products.find((p) => p.id === mapping.productId)?.name ?? mapping.productId;
        const categoryName = ruleCategories.find((c) => c.id === mapping.categoryId)?.name ?? mapping.categoryId;
        get().logAudit({
          user: currentUser.name,
          action: "Access Added",
          entity: "UserProductAccess",
          entityId: id,
          details: `Granted ${userName} ${mapping.capabilities.length} permission(s) on "${productName}" / "${categoryName}".`,
        });
        return { ok: true };
      },
      updateUserAccessMapping: (id, patch) => {
        const { currentUser, users, products, ruleCategories, userAccessMappings } = get();
        if (!can(get(), "config.manage")) return;
        const existing = userAccessMappings.find((m) => m.id === id);
        if (!existing) return;
        set((s) => ({
          userAccessMappings: s.userAccessMappings.map((m) =>
            m.id === id ? { ...m, ...patch, updatedAt: new Date().toISOString() } : m
          ),
        }));
        const userName = users.find((u) => u.id === existing.userId)?.name ?? existing.userId;
        const productName = products.find((p) => p.id === existing.productId)?.name ?? existing.productId;
        const categoryName = ruleCategories.find((c) => c.id === existing.categoryId)?.name ?? existing.categoryId;
        get().logAudit({
          user: currentUser.name,
          action: "Access Updated",
          entity: "UserProductAccess",
          entityId: id,
          details: `Updated ${userName}'s access to "${productName}" / "${categoryName}"${patch.capabilities ? ` — now ${patch.capabilities.length} permission(s)` : ""}.`,
        });
      },
      deleteUserAccessMapping: (id) => {
        const { currentUser, users, products, ruleCategories, userAccessMappings } = get();
        if (!can(get(), "config.manage")) return;
        const existing = userAccessMappings.find((m) => m.id === id);
        if (!existing) return;
        set((s) => ({ userAccessMappings: s.userAccessMappings.filter((m) => m.id !== id) }));
        const userName = users.find((u) => u.id === existing.userId)?.name ?? existing.userId;
        const productName = products.find((p) => p.id === existing.productId)?.name ?? existing.productId;
        const categoryName = ruleCategories.find((c) => c.id === existing.categoryId)?.name ?? existing.categoryId;
        get().logAudit({
          user: currentUser.name,
          action: "Access Deleted",
          entity: "UserProductAccess",
          entityId: id,
          details: `Removed ${userName}'s access (${existing.capabilities.length} permission(s)) to "${productName}" / "${categoryName}".`,
        });
      },

      products: DEFAULT_PRODUCTS,
      addProduct: (product) => {
        const { currentUser } = get();
        if (!can(get(), "config.manage")) return;
        set((s) => ({ products: [...s.products, product] }));
        get().logAudit({ user: currentUser.name, action: "Created Product", entity: "Product", entityId: product.id, details: `Added product "${product.name}" (${product.code}).` });
      },
      updateProduct: (id, patch) => {
        const { currentUser } = get();
        if (!can(get(), "config.manage")) return;
        set((s) => ({
          products: s.products.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString(), updatedBy: currentUser.name } : p)),
        }));
        get().logAudit({ user: currentUser.name, action: "Updated Product", entity: "Product", entityId: id, details: `Product "${id}" updated.` });
      },
      publishProduct: (id) => {
        const { currentUser, products } = get();
        if (!can(get(), "config.manage")) {
          return { ok: false, reason: `${currentUser.name} doesn't have permission to publish products.` };
        }
        const product = products.find((p) => p.id === id);
        if (!product) return { ok: false, reason: "Product not found." };
        // Maker-Checker parity with rules — a product bundles many rules and
        // is directly API-callable once live, arguably higher-risk than a
        // single rule, but previously had no second-person review at all
        // (audit finding B24). Block the same person who last edited the
        // product's own overview from also being the one who publishes it.
        if (product.updatedBy && product.updatedBy === currentUser.name) {
          get().logAudit({ user: currentUser.name, action: "Publish Denied", entity: "Product", entityId: id, details: `${currentUser.name} cannot publish "${product.name}" — they also made the last edit to it (maker-checker).` });
          return { ok: false, reason: "You made the last edit to this product — switch to a different reviewer role to publish it." };
        }
        const now = new Date().toISOString();
        set((s) => ({
          products: s.products.map((p) =>
            p.id === id ? { ...p, publishStatus: "Published", lastPublishedAt: now, updatedAt: now } : p
          ),
        }));
        get().logAudit({ user: currentUser.name, action: "Published Product", entity: "Product", entityId: id, details: `Product "${product.name}" published — available via the Product API.` });
        return { ok: true };
      },

      deleteProduct: (id) => {
        const { currentUser, products, productRuleMappings, simulations } = get();
        if (!can(get(), "config.manage")) {
          return { ok: false, reason: `${currentUser.name} doesn't have permission to delete products.` };
        }
        const product = products.find((p) => p.id === id);
        if (!product) return { ok: false, reason: "Product not found." };
        const hasMappings = productRuleMappings.some((m) => m.productId === id);
        const hasSimulations = simulations.some((s) => s.productId === id);
        if (hasMappings || hasSimulations) {
          return { ok: false, reason: "This product has rule mappings or simulation history — deactivate it instead of deleting." };
        }
        set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
        get().logAudit({ user: currentUser.name, action: "Deleted Product", entity: "Product", entityId: id, details: `Unused product "${product.name}" (${product.code}) permanently deleted — no mappings or simulation history existed.` });
        return { ok: true };
      },

      productRuleMappings: DEFAULT_PRODUCT_RULE_MAPPINGS,
      saveProductRuleMapping: (productId, ruleIdsInput) => {
        const { currentUser } = get();
        if (!can(get(), "config.manage")) return;
        const now = new Date().toISOString();
        // De-dupe: a rule is only ever mapped once per product (guards against
        // a duplicate (product, rule) row — see findDuplicateRules).
        const ruleIds = [...new Set(ruleIdsInput)];
        // Rules whose membership in THIS product changed (added or removed) —
        // used below to trigger re-approval on any already-live rule.
        const beforeIds = new Set(get().productRuleMappings.filter((m) => m.productId === productId).map((m) => m.ruleId));
        const afterIds = new Set(ruleIds);
        const changedRuleIds = new Set(
          [...beforeIds, ...afterIds].filter((rid) => beforeIds.has(rid) !== afterIds.has(rid))
        );
        set((s) => ({
          productRuleMappings: [
            ...s.productRuleMappings.filter((m) => m.productId !== productId),
            ...ruleIds.map((ruleId, i) => ({
              id: `prm-${productId}-${ruleId}-${Date.now()}-${i}`,
              productId,
              ruleId,
              active: true,
              order: i,
              createdAt: now,
              createdBy: currentUser.name,
            })),
          ],
          // A mapping change on an already Approved/Published rule invalidates
          // its approval — return it to Draft (requirement: any mapping change
          // triggers the approval workflow).
          rules: s.rules.map((r) =>
            changedRuleIds.has(r.id) && (r.status === "Approved" || r.status === "Published")
              ? { ...r, status: "Draft", updatedAt: now }
              : r
          ),
        }));
        const reverted = get().rules.filter((r) => changedRuleIds.has(r.id) && r.status === "Draft").length;
        get().logAudit({ user: currentUser.name, action: "Mapped Rules to Product", entity: "Product", entityId: productId, details: `${ruleIds.length} rule(s) mapped${reverted ? ` — ${reverted} live rule(s) returned to Draft for re-approval` : ""}.` });
      },

      recentProductIds: [],
      recordRecentProduct: (id) =>
        set((s) => ({ recentProductIds: [id, ...s.recentProductIds.filter((p) => p !== id)].slice(0, 5) })),

      notifyCategories: DEFAULT_NOTIFY_CATEGORIES,
      notifyTriggers: DEFAULT_NOTIFY_TRIGGERS,
      notifyWorkflows: DEFAULT_NOTIFY_WORKFLOWS,
      notifyWorkflowTemplates: DEFAULT_NOTIFY_WORKFLOW_TEMPLATES,
      addNotifyWorkflow: (workflow) => {
        const { currentUser } = get();
        if (!can(get(), "notifyx.create")) return;
        set((s) => ({ notifyWorkflows: [...s.notifyWorkflows, workflow] }));
        get().logAudit({ user: currentUser.name, action: "Created Workflow", entity: "NotifyWorkflow", entityId: workflow.id, details: `Added workflow "${workflow.name}".` });
      },
      updateNotifyWorkflow: (id, patch) => {
        const { currentUser } = get();
        if (!can(get(), "notifyx.edit")) return;
        set((s) => ({
          notifyWorkflows: s.notifyWorkflows.map((w) => (w.id === id ? { ...w, ...patch, updatedAt: new Date().toISOString() } : w)),
        }));
        get().logAudit({ user: currentUser.name, action: "Updated Workflow", entity: "NotifyWorkflow", entityId: id, details: `Workflow "${id}" updated.` });
      },
      deleteNotifyWorkflow: (id) => {
        const { currentUser, notifyWorkflows } = get();
        if (!can(get(), "notifyx.edit")) return;
        const workflow = notifyWorkflows.find((w) => w.id === id);
        if (!workflow || workflow.status !== "Draft") return;
        set((s) => ({ notifyWorkflows: s.notifyWorkflows.filter((w) => w.id !== id) }));
        get().logAudit({ user: currentUser.name, action: "Deleted Workflow", entity: "NotifyWorkflow", entityId: id, details: `Draft workflow "${workflow.name}" deleted.` });
      },
      toggleNotifyWorkflowStatus: (id) => {
        const { currentUser, notifyWorkflows } = get();
        if (!can(get(), "notifyx.toggle")) return;
        const workflow = notifyWorkflows.find((w) => w.id === id);
        if (!workflow) return;
        // Active -> Paused; anything else (Draft or Paused) -> Active — same
        // toggle semantics as the reference blueprint's list-screen behavior.
        const nextStatus = workflow.status === "Active" ? "Paused" : "Active";
        const now = new Date().toISOString();
        set((s) => ({
          notifyWorkflows: s.notifyWorkflows.map((w) => (w.id === id ? { ...w, status: nextStatus, updatedAt: now } : w)),
        }));
        get().logAudit({ user: currentUser.name, action: nextStatus === "Active" ? "Activated Workflow" : "Paused Workflow", entity: "NotifyWorkflow", entityId: id, details: `Workflow "${workflow.name}" is now ${nextStatus}.` });
      },
      cloneNotifyWorkflow: (id) => {
        const { currentUser, notifyWorkflows } = get();
        if (!can(get(), "notifyx.create")) return;
        const source = notifyWorkflows.find((w) => w.id === id);
        if (!source) return;
        const now = new Date().toISOString();
        const clone: NotifyWorkflow = {
          ...source,
          id: `wf-${Date.now()}`,
          name: `${source.name} (Copy)`,
          status: "Draft",
          steps: source.steps.map((step) => ({ ...step, id: `${step.id}-${Date.now()}` })),
          createdAt: now,
          updatedAt: now,
          createdBy: currentUser.name,
          runCount: 0,
          logs: [],
        };
        set((s) => ({ notifyWorkflows: [...s.notifyWorkflows, clone] }));
        get().logAudit({ user: currentUser.name, action: "Cloned Workflow", entity: "NotifyWorkflow", entityId: clone.id, details: `Cloned "${source.name}" to "${clone.name}" as Draft.` });
      },
      importNotifyWorkflowTemplate: (templateId) => {
        const { currentUser, notifyWorkflowTemplates } = get();
        if (!can(get(), "notifyx.create")) return;
        const template = notifyWorkflowTemplates.find((t) => t.id === templateId);
        if (!template) return;
        const now = new Date().toISOString();
        const workflow: NotifyWorkflow = {
          id: `wf-${Date.now()}`,
          name: template.name,
          categoryId: template.categoryId,
          triggerId: template.triggerId,
          status: "Draft",
          steps: template.steps.map((step) => ({ ...step, id: `${step.id}-${Date.now()}` })),
          createdAt: now,
          updatedAt: now,
          createdBy: currentUser.name,
          runCount: 0,
          logs: [],
        };
        set((s) => ({ notifyWorkflows: [...s.notifyWorkflows, workflow] }));
        get().logAudit({ user: currentUser.name, action: "Created Workflow", entity: "NotifyWorkflow", entityId: workflow.id, details: `Imported template "${template.name}" as a new Draft workflow.` });
      },

      ruleGroups: DEFAULT_RULE_GROUPS,
      addRuleGroup: (group) => {
        if (!can(get(), "config.manage")) return;
        set((s) => ({ ruleGroups: [...s.ruleGroups, group] }));
        get().logAudit({ user: get().currentUser.name, action: "Created Rule Group", entity: "RuleGroup", entityId: group.id, details: `Added rule group "${group.name}".` });
      },
      updateRuleGroup: (id, patch) => {
        if (!can(get(), "config.manage")) return;
        set((s) => ({ ruleGroups: s.ruleGroups.map((g) => (g.id === id ? { ...g, ...patch } : g)) }));
        get().logAudit({ user: get().currentUser.name, action: "Updated Rule Group", entity: "RuleGroup", entityId: id, details: `Rule group "${id}" updated.` });
      },
      deleteRuleGroup: (id) => {
        if (!can(get(), "config.manage")) return;
        set((s) => ({ ruleGroups: s.ruleGroups.filter((g) => g.id !== id) }));
        get().logAudit({ user: get().currentUser.name, action: "Deleted Rule Group", entity: "RuleGroup", entityId: id, details: `Rule group "${id}" removed.` });
      },

      ruleTemplates: DEFAULT_RULE_TEMPLATES,
      addRuleTemplate: (template) => {
        const { currentUser } = get();
        if (!can(get(), "config.manage")) return;
        set((s) => ({ ruleTemplates: [...s.ruleTemplates, template] }));
        get().logAudit({ user: currentUser.name, action: "Created Rule Template", entity: "RuleTemplate", entityId: template.id, details: `Added rule template "${template.name}".` });
      },
      updateRuleTemplate: (id, patch) => {
        const { currentUser } = get();
        if (!can(get(), "config.manage")) return;
        set((s) => ({ ruleTemplates: s.ruleTemplates.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
        get().logAudit({ user: currentUser.name, action: "Updated Rule Template", entity: "RuleTemplate", entityId: id, details: `Rule template "${id}" updated.` });
      },
      deleteRuleTemplate: (id) => {
        const { currentUser } = get();
        if (!can(get(), "config.manage")) return;
        set((s) => ({ ruleTemplates: s.ruleTemplates.filter((t) => t.id !== id) }));
        get().logAudit({ user: currentUser.name, action: "Deleted Rule Template", entity: "RuleTemplate", entityId: id, details: `Rule template "${id}" removed.` });
      },

      approvalRequests: DEFAULT_APPROVAL_REQUESTS,
      submitForReview: (ruleId) => {
        const rule = get().rules.find((r) => r.id === ruleId);
        if (!rule) return { ok: false, reason: "Rule not found." };
        const { currentUser } = get();
        if (!can(get(), "rule.edit")) {
          return { ok: false, reason: `${currentUser.name} doesn't have permission to submit rules for review.` };
        }
        // Maker-Checker: a rule can't enter approval without a product mapping —
        // the Checker reviews the complete configuration (rule + mapping).
        const hasMapping = get().productRuleMappings.some((m) => m.ruleId === ruleId);
        if (!hasMapping) {
          return { ok: false, reason: "Map at least one product to this rule before submitting for approval." };
        }

        set((s) => ({
          rules: s.rules.map((r) => (r.id === ruleId ? { ...r, status: "Pending Approval", updatedAt: new Date().toISOString() } : r)),
          approvalRequests: [
            { id: `AR-${Date.now()}`, ruleId, stage: "Pending Review", requestedBy: currentUser.name, requestedAt: new Date().toISOString() },
            ...s.approvalRequests,
          ],
        }));
        get().logAudit({ user: currentUser.name, action: "Submitted for Approval", entity: "BusinessRule", entityId: ruleId, details: `${rule.name} submitted with its product mapping and queued for Checker review.` });
        return { ok: true };
      },
      approveRule: (ruleId) => {
        const rule = get().rules.find((r) => r.id === ruleId);
        if (!rule) return { ok: false, reason: "Rule not found." };
        const { currentUser, approvalRequests, users } = get();

        if (!can(get(), "rule.publish")) {
          get().logAudit({ user: currentUser.name, action: "Approval Denied", entity: "BusinessRule", entityId: ruleId, details: `${currentUser.name} attempted to approve ${rule.name} without the rule.publish capability.` });
          return { ok: false, reason: `${currentUser.name} doesn't have permission to approve rules.` };
        }
        if (rule.status !== "Pending Approval") {
          return { ok: false, reason: `Only rules Pending Approval can be approved — "${rule.name}" is ${rule.status}.` };
        }
        // A rule can't be approved unless a product mapping exists.
        if (!get().productRuleMappings.some((m) => m.ruleId === ruleId)) {
          return { ok: false, reason: "This rule has no product mapping — it can't be approved." };
        }
        // Maker-Checker category scoping — an empty approvalCategories list
        // means "unrestricted" (e.g. a System Administrator persona), a
        // non-empty list is a strict whitelist of the categories this person
        // is authorized to approve, matching User Management's own framing
        // ("Rule Approval Responsibilities").
        const approver = users.find((u) => u.name === currentUser.name);
        if (approver && approver.approvalCategories.length > 0 && !approver.approvalCategories.includes(rule.category)) {
          get().logAudit({ user: currentUser.name, action: "Approval Denied", entity: "BusinessRule", entityId: ruleId, details: `${currentUser.name} attempted to approve ${rule.name} (category "${rule.category}") outside their approval responsibilities (${approver.approvalCategories.join(", ")}).` });
          return { ok: false, reason: `Your approval responsibilities don't include the "${rule.category}" category.` };
        }
        // Segregation of duties — the approver may not be the rule's creator
        // or its submitter. The same person can never create/map and approve.
        const pending = approvalRequests.find((a) => a.ruleId === ruleId && a.stage === "Pending Review");
        if (rule.createdBy === currentUser.name || (pending && pending.requestedBy === currentUser.name)) {
          get().logAudit({ user: currentUser.name, action: "Approval Denied", entity: "BusinessRule", entityId: ruleId, details: `${currentUser.name} cannot approve ${rule.name} — they created or submitted it (segregation of duties).` });
          return { ok: false, reason: "You created or submitted this rule — a different Checker must approve it." };
        }

        set((s) => ({
          rules: s.rules.map((r) => (r.id === ruleId ? { ...r, status: "Approved", updatedAt: new Date().toISOString() } : r)),
          approvalRequests: s.approvalRequests.map((a) =>
            a.ruleId === ruleId && a.stage === "Pending Review"
              ? { ...a, stage: "Approved", decidedBy: currentUser.name, decidedAt: new Date().toISOString() }
              : a
          ),
        }));
        get().logAudit({ user: currentUser.name, action: "Approved Rule", entity: "BusinessRule", entityId: ruleId, details: `${rule.name} approved — awaiting publish.` });
        return { ok: true };
      },
      rejectRule: (ruleId, comment) => {
        const rule = get().rules.find((r) => r.id === ruleId);
        if (!rule) return { ok: false, reason: "Rule not found." };
        const { currentUser, users } = get();

        if (!can(get(), "rule.publish")) {
          get().logAudit({ user: currentUser.name, action: "Approval Denied", entity: "BusinessRule", entityId: ruleId, details: `${currentUser.name} attempted to reject ${rule.name} without the rule.publish capability.` });
          return { ok: false, reason: `${currentUser.name} doesn't have permission to make review decisions.` };
        }
        const approver = users.find((u) => u.name === currentUser.name);
        if (approver && approver.approvalCategories.length > 0 && !approver.approvalCategories.includes(rule.category)) {
          get().logAudit({ user: currentUser.name, action: "Approval Denied", entity: "BusinessRule", entityId: ruleId, details: `${currentUser.name} attempted to reject ${rule.name} (category "${rule.category}") outside their approval responsibilities (${approver.approvalCategories.join(", ")}).` });
          return { ok: false, reason: `Your approval responsibilities don't include the "${rule.category}" category.` };
        }

        set((s) => ({
          rules: s.rules.map((r) => (r.id === ruleId ? { ...r, status: "Rejected", updatedAt: new Date().toISOString() } : r)),
          approvalRequests: s.approvalRequests.map((a) =>
            a.ruleId === ruleId && a.stage === "Pending Review"
              ? { ...a, stage: "Rejected", decidedBy: currentUser.name, decidedAt: new Date().toISOString(), comment }
              : a
          ),
        }));
        get().logAudit({ user: currentUser.name, action: "Rejected Rule", entity: "BusinessRule", entityId: ruleId, details: `${rule.name} rejected during review${comment ? `: ${comment}` : "."}` });
        return { ok: true };
      },
      publishRule: (ruleId) => {
        const rule = get().rules.find((r) => r.id === ruleId);
        if (!rule) return { ok: false, reason: "Rule not found." };
        const { currentUser } = get();
        if (!can(get(), "rule.publish")) {
          return { ok: false, reason: `${currentUser.name} doesn't have permission to publish rules.` };
        }
        if (rule.status !== "Approved") {
          return { ok: false, reason: `Only Approved rules can be published — "${rule.name}" is ${rule.status}.` };
        }
        set((s) => ({
          rules: s.rules.map((r) => (r.id === ruleId ? { ...r, status: "Published", updatedAt: new Date().toISOString() } : r)),
        }));
        get().logAudit({ user: currentUser.name, action: "Published Rule", entity: "BusinessRule", entityId: ruleId, details: `${rule.name} published — now live.` });
        return { ok: true };
      },
      // Rule-centric product mapping used by the Map-to-Product dialog during
      // submission (distinct from the product-centric saveProductRuleMapping in
      // Configuration Studio). Replaces this rule's mappings with one per
      // product, and — since the mapping is part of the approved configuration
      // — reverts an already Approved/Published rule to Draft for re-approval.
      mapRuleToProducts: (ruleId, config) => {
        const rule = get().rules.find((r) => r.id === ruleId);
        if (!rule) return { ok: false, reason: "Rule not found." };
        const { currentUser } = get();
        if (!can(get(), "rule.edit")) {
          return { ok: false, reason: `${currentUser.name} doesn't have permission to map rules.` };
        }
        if (config.productIds.length === 0) {
          return { ok: false, reason: "Select at least one product to map." };
        }
        const now = new Date().toISOString();
        const seq = config.sequence;
        // De-dupe: a rule is only ever mapped once per product (guards against
        // a duplicate (product, rule) row — see findDuplicateRules).
        const uniqueProductIds = [...new Set(config.productIds)];
        set((s) => ({
          productRuleMappings: [
            ...s.productRuleMappings.filter((m) => m.ruleId !== ruleId),
            ...uniqueProductIds.map((productId, i) => ({
              id: `prm-${ruleId}-${productId}-${Date.now()}-${i}`,
              productId,
              ruleId,
              active: true,
              order: seq ?? i,
              effectiveDate: config.effectiveDate,
              remarks: config.remarks,
              createdAt: now,
              createdBy: currentUser.name,
            })),
          ],
          rules: s.rules.map((r) =>
            r.id === ruleId
              ? {
                  ...r,
                  category: config.categoryId ?? r.category,
                  priority: config.priority ?? r.priority,
                  // A mapping change on an already-approved/published rule
                  // invalidates its approval — return to Draft.
                  status: r.status === "Approved" || r.status === "Published" ? "Draft" : r.status,
                  updatedAt: now,
                }
              : r
          ),
        }));
        const wasLive = rule.status === "Approved" || rule.status === "Published";
        get().logAudit({ user: currentUser.name, action: "Mapped Rule to Product(s)", entity: "BusinessRule", entityId: ruleId, details: `${rule.name} mapped to ${config.productIds.length} product(s)${wasLive ? " — returned to Draft for re-approval" : ""}.` });
        return { ok: true };
      },

      // FUTURE: promoteRuleEnvironment removed for demo.
      // Restore the full implementation when environment promotion is reintroduced.
      promoteRuleEnvironment: (_ruleId: string) => ({ ok: false, reason: "Environment promotion is disabled in this release." }),

      ruleVersions: [],

      addRule: (rule) => {
        const { currentUser } = get();
        if (!can(get(), "rule.create")) {
          return { ok: false, reason: `${currentUser.name} doesn't have permission to create rules.` };
        }
        // Guard against a duplicate id entering the store — without this the
        // rules array can hold two rules with the same id, which breaks React
        // keys and double-evaluates the rule in the engine (see getMappedRules).
        if (get().rules.some((r) => r.id === rule.id)) {
          return { ok: false, reason: `A rule with id ${rule.id} already exists.` };
        }
        // Stamp the creator for Maker-Checker segregation of duties (the
        // approver may not be the person who authored the rule).
        const withCreator: BusinessRule = { ...rule, createdBy: rule.createdBy ?? currentUser.name };
        set((s) => ({
          rules: [withCreator, ...s.rules],
          ruleVersions: [snapshotFromRule(withCreator, currentUser.name, "created"), ...s.ruleVersions],
        }));
        return { ok: true };
      },

      updateRule: (id, updater) => {
        const { currentUser } = get();
        if (!can(get(), "rule.edit")) {
          return { ok: false, reason: `${currentUser.name} doesn't have permission to edit rules.` };
        }
        const before = get().rules.find((r) => r.id === id);
        set((s) => ({
          rules: s.rules.map((r) => (r.id === id ? updater(r) : r)),
        }));
        // Governance: editing a rule that was already Approved/Published (or
        // mid-review) invalidates that approval — send it back to Draft and
        // close any open approval request. Re-submission is required.
        const REAPPROVAL_STATES: RuleStatus[] = ["Pending Approval", "Approved", "Published"];
        if (before && REAPPROVAL_STATES.includes(before.status)) {
          set((s) => ({
            rules: s.rules.map((r) => (r.id === id ? { ...r, status: "Draft" } : r)),
            approvalRequests: s.approvalRequests.map((a) =>
              a.ruleId === id && a.stage === "Pending Review"
                ? { ...a, stage: "Rejected", decidedBy: currentUser.name, decidedAt: new Date().toISOString(), comment: "Superseded by an edit — re-approval required." }
                : a
            ),
          }));
          get().logAudit({ user: currentUser.name, action: "Edit reset rule to Draft", entity: "BusinessRule", entityId: id, details: `${before.name} was ${before.status}; editing it requires re-approval, so it returned to Draft.` });
        }
        const updated = get().rules.find((r) => r.id === id);
        if (updated) {
          set((s) => ({
            ruleVersions: [snapshotFromRule(updated, currentUser.name, "edited"), ...s.ruleVersions],
          }));
        }
        return { ok: true };
      },

      restoreRuleVersion: (ruleId, version) => {
        const snapshot = get().ruleVersions.find((v) => v.ruleId === ruleId && v.version === version);
        const rule = get().rules.find((r) => r.id === ruleId);
        if (!snapshot || !rule) return { ok: false, reason: "That version could not be found." };

        const restored: BusinessRule = {
          ...rule,
          name: snapshot.name,
          category: snapshot.category,
          subCategory: snapshot.subCategory,
          groupId: snapshot.groupId,
          sequence: snapshot.sequence,
          priority: snapshot.priority,
          owner: snapshot.owner,
          description: snapshot.description,
          rootGroup: snapshot.rootGroup,
          actions: snapshot.actions,
          elseActions: snapshot.elseActions,
          version: rule.version + 1,
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({
          rules: s.rules.map((r) => (r.id === ruleId ? restored : r)),
          ruleVersions: [
            snapshotFromRule(restored, get().currentUser.name, "restored", version),
            ...s.ruleVersions,
          ],
        }));
        get().logAudit({
          user: get().currentUser.name,
          action: "Restored Rule Version",
          entity: "BusinessRule",
          entityId: ruleId,
          details: `${restored.name} restored to the content of v${version} (now v${restored.version}).`,
        });
        return { ok: true };
      },

      setRuleStatus: (id, status) => {
        const rule = get().rules.find((r) => r.id === id);
        if (!rule) return { ok: false, reason: "Rule not found." };
        const { currentUser } = get();
        if (!can(get(), "rule.publish")) {
          return { ok: false, reason: `${currentUser.name} doesn't have permission to change a rule's status.` };
        }

        set((s) => ({
          rules: s.rules.map((r) =>
            r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r
          ),
        }));
        get().logAudit({
          user: currentUser.name,
          action: `Status → ${status}`,
          entity: "BusinessRule",
          entityId: id,
          details: `${rule.name} status changed to ${status}.`,
        });
        return { ok: true };
      },

      cloneRule: (id) => {
        const source = get().rules.find((r) => r.id === id);
        if (!source) return { ok: false, reason: "Rule not found." };
        const { currentUser } = get();
        if (!can(get(), "rule.create")) {
          return { ok: false, reason: `${currentUser.name} doesn't have permission to create rules.` };
        }

        const newId = nextRuleIdFor(get().rules);
        const clone: BusinessRule = {
          ...source,
          id: newId,
          name: `${source.name} (Copy)`,
          status: "Draft",
          createdBy: currentUser.name,
          // environment: "Dev", // FUTURE: restore when environment promotion is reintroduced
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({
          rules: [clone, ...s.rules],
          ruleVersions: [snapshotFromRule(clone, currentUser.name, "created"), ...s.ruleVersions],
        }));
        get().logAudit({
          user: currentUser.name,
          action: "Cloned Rule",
          entity: "BusinessRule",
          entityId: newId,
          details: `Cloned from ${id} as Draft.`,
        });
        return { ok: true, newId };
      },

      archiveRule: (id) => get().setRuleStatus(id, "Archived"),

      deleteRule: (id) => {
        const rule = get().rules.find((r) => r.id === id);
        if (!rule) return { ok: false, reason: "Rule not found." };
        const { currentUser } = get();
        if (!can(get(), "rule.delete")) {
          return { ok: false, reason: `${currentUser.name} doesn't have permission to permanently delete rules.` };
        }
        if (rule.status !== "Archived") {
          return { ok: false, reason: "Only Archived rules can be permanently deleted." };
        }

        set((s) => ({ rules: s.rules.filter((r) => r.id !== id) }));
        get().logAudit({ user: currentUser.name, action: "Deleted Rule", entity: "BusinessRule", entityId: id, details: `${rule.name} permanently deleted.` });
        return { ok: true };
      },

      // Matrix rows feed directly into live decision outcomes (interest
      // rate/haircut/premium), the same execution-impact tier as a rule's own
      // conditions/actions — gate every mutation on the same "rule.edit"
      // capability rule editing itself requires, not left open to any role.
      addMatrix: (matrix) => {
        const { currentUser } = get();
        if (!can(get(), "rule.edit")) return;
        set((s) => ({ matrices: [...s.matrices, matrix] }));
        get().logAudit({ user: currentUser.name, action: "Created Matrix", entity: "DecisionMatrix", entityId: matrix.id, details: `New matrix "${matrix.name}" created for ${matrix.domain}.` });
      },
      deleteMatrix: (matrixId) => {
        const { currentUser, matrices } = get();
        if (!can(get(), "rule.edit")) return;
        const matrix = matrices.find((m) => m.id === matrixId);
        set((s) => ({ matrices: s.matrices.filter((m) => m.id !== matrixId) }));
        get().logAudit({ user: currentUser.name, action: "Deleted Matrix", entity: "DecisionMatrix", entityId: matrixId, details: `Matrix "${matrix?.name ?? matrixId}" deleted.` });
      },
      updateMatrixRows: (matrixId, rows) => {
        if (!can(get(), "rule.edit")) return;
        set((s) => ({
          matrices: s.matrices.map((m) =>
            m.id === matrixId ? { ...m, rows, updatedAt: new Date().toISOString() } : m
          ),
        }));
      },

      addMatrixRow: (matrixId, row) => {
        const { currentUser } = get();
        if (!can(get(), "rule.edit")) return;
        set((s) => ({
          matrices: s.matrices.map((m) =>
            m.id === matrixId ? { ...m, rows: [...m.rows, row], updatedAt: new Date().toISOString() } : m
          ),
        }));
        get().logAudit({ user: currentUser.name, action: "Added Matrix Row", entity: "DecisionMatrix", entityId: matrixId, details: `Row ${row.id} added.` });
      },

      updateMatrixRow: (matrixId, rowId, values) => {
        const { currentUser } = get();
        if (!can(get(), "rule.edit")) return;
        set((s) => ({
          matrices: s.matrices.map((m) =>
            m.id === matrixId
              ? {
                  ...m,
                  rows: m.rows.map((r) => (r.id === rowId ? { ...r, values } : r)),
                  updatedAt: new Date().toISOString(),
                }
              : m
          ),
        }));
        get().logAudit({ user: currentUser.name, action: "Edited Matrix Row", entity: "DecisionMatrix", entityId: matrixId, details: `Row ${rowId} values updated.` });
      },

      deleteMatrixRow: (matrixId, rowId) => {
        const { currentUser } = get();
        if (!can(get(), "rule.edit")) return;
        set((s) => ({
          matrices: s.matrices.map((m) =>
            m.id === matrixId
              ? { ...m, rows: m.rows.filter((r) => r.id !== rowId), updatedAt: new Date().toISOString() }
              : m
          ),
        }));
        get().logAudit({ user: currentUser.name, action: "Deleted Matrix Row", entity: "DecisionMatrix", entityId: matrixId, details: `Row ${rowId} removed.` });
      },

      duplicateMatrixRow: (matrixId, rowId) => {
        const { currentUser } = get();
        if (!can(get(), "rule.edit")) return;
        const matrix = get().matrices.find((m) => m.id === matrixId);
        const row = matrix?.rows.find((r) => r.id === rowId);
        if (!matrix || !row) return;
        matrixRowSeq += 1;
        const newRow: MatrixRow = { id: `R${matrixRowSeq}`, values: { ...row.values } };
        set((s) => ({
          matrices: s.matrices.map((m) =>
            m.id === matrixId ? { ...m, rows: [...m.rows, newRow], updatedAt: new Date().toISOString() } : m
          ),
        }));
        get().logAudit({ user: currentUser.name, action: "Duplicated Matrix Row", entity: "DecisionMatrix", entityId: matrixId, details: `Row ${rowId} duplicated as ${newRow.id}.` });
      },

      addSimulation: (result) => set((s) => ({ simulations: [result, ...s.simulations].slice(0, 50) })),

      // Batch Testing — summary-only, capped at 20 (mirrors addSimulation's
      // history cap above). Per-row results are never stored here; see
      // BatchRunSummary's doc comment in types.ts for why.
      addBatchRunSummary: (summary) => {
        const id = `BATCH-${Date.now()}`;
        set((s) => ({ batchRuns: [{ ...summary, id }, ...s.batchRuns].slice(0, 20) }));
        return id;
      },
      markBatchReportDownloaded: (id) =>
        set((s) => ({ batchRuns: s.batchRuns.map((b) => (b.id === id ? { ...b, reportDownloaded: true } : b)) })),

      logAudit: (entry) =>
        set((s) => {
          const timestamp = new Date().toISOString();
          const prevHash = s.auditLog[0]?.hash ?? "";
          const content = { ...entry, timestamp };
          const hash = hashAuditEntry(prevHash, content);
          // Capped like addSimulation's history — unbounded growth persisted
          // whole into a single localStorage key risks exceeding the origin's
          // storage quota and silently corrupting/losing all app state, not
          // just the log (audit finding A7). Trimming only ever drops the
          // oldest entries off the tail, so the hash chain among everything
          // that's kept stays fully valid.
          const auditLog = [{ ...content, id: `A-${Date.now()}`, prevHash, hash }, ...s.auditLog].slice(0, AUDIT_LOG_CAP);
          return { auditLog };
        }),

      setAppearance: (patch) => set((s) => ({ appearance: { ...s.appearance, ...patch } })),
      resetAppearance: () => set({ appearance: DEFAULT_APPEARANCE }),
      setAppearanceOpen: (open) => set({ appearanceOpen: open }),

      setDashboardLayout: (key, layout) => set((s) => ({ dashboardLayouts: { ...s.dashboardLayouts, [key]: layout } })),
      resetDashboardLayout: (key) =>
        set((s) => {
          const next = { ...s.dashboardLayouts };
          delete next[key];
          return { dashboardLayouts: next };
        }),

      dashboardConfigs: DEFAULT_DASHBOARD_CONFIGS,
      setDashboardConfig: (userId, config) => {
        const { currentUser } = get();
        if (!can(get(), "config.manage")) return;
        set((s) => ({ dashboardConfigs: { ...s.dashboardConfigs, [userId]: config } }));
        get().logAudit({
          user: currentUser.name,
          action: "Updated Dashboard Config",
          entity: "DashboardConfig",
          entityId: userId,
          details: `Dashboard defaults for user "${userId}" updated.`,
        });
      },

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setConfigStudioNavCollapsed: (collapsed) => set({ configStudioNavCollapsed: collapsed }),
    }),
    {
      name: "bre-prototype-store",
      version: 51,
      skipHydration: true,
      migrate: (persistedState) => {
        // v50 -> v51 added `applications` (seed customer applications for the
        // Simulator's Application-ID mode) — a brand-new key; the default
        // shallow merge fills it from initial state (DEFAULT_APPLICATIONS)
        // automatically, nothing to backfill.

        // v49 -> v50 added `batchRuns` (Batch Testing run history) — a
        // brand-new key, same as `recentProductIds` in the v22 -> v23 note
        // below: the default shallow merge fills it in from initial state
        // ([]) automatically, nothing to backfill here.

        // v48 -> v49 replaced the operational RuleStatus with the Maker-Checker
        // governance lifecycle: "Active" -> "Published", "Testing" -> "Pending
        // Approval". Also backfills BusinessRule.createdBy (for segregation of
        // duties) from the earliest "Created Rule" audit entry, else `owner`.
        {
          const s = persistedState as Partial<AppState>;
          if (s?.rules) {
            const creatorByRuleId = new Map<string, string>();
            for (const entry of s.auditLog ?? []) {
              if (entry.action === "Created Rule" && entry.entityId && !creatorByRuleId.has(entry.entityId)) {
                creatorByRuleId.set(entry.entityId, entry.user);
              }
            }
            s.rules = s.rules.map((r) => {
              const legacyStatus = (r.status as string) ?? "Draft";
              const status: RuleStatus =
                legacyStatus === "Active"
                  ? "Published"
                  : legacyStatus === "Testing"
                  ? "Pending Approval"
                  : (legacyStatus as RuleStatus);
              return { ...r, status, createdBy: r.createdBy ?? creatorByRuleId.get(r.id) ?? r.owner };
            });
          }
        }

        // v47 -> v48 deleted the Role entity. Access is now driven entirely
        // by User Management: AppUser.isAdmin grants the config/admin caps,
        // and each user's UserProductAccess rows grant rule.* caps. Demo
        // login reads from Users. This derives everything from the outgoing
        // per-role data so no user loses access, then drops roles/
        // productAccessConfigs. (Runs first so later steps see final shapes.)
        {
          const s = persistedState as Partial<AppState> & {
            roles?: { id: string; name: string; personaName: string; capabilities: Capability[] }[];
            productAccessConfigs?: unknown;
          };
          const oldRoles = s.roles ?? [];
          const roleById = new Map(oldRoles.map((r) => [r.id, r]));
          const roleByName = new Map(oldRoles.map((r) => [r.name, r]));

          if (s.users) {
            for (const u of s.users) {
              const uu = u as AppUser & { permissions?: unknown };
              const oldRole = roleById.get(uu.role) ?? roleByName.get(uu.role);
              // Admin flag from the old role's config caps (only if unset).
              if (typeof uu.isAdmin !== "boolean") {
                uu.isAdmin =
                  !!oldRole &&
                  (oldRole.capabilities.includes("config.manage") || oldRole.capabilities.includes("system.manage"));
              }
              // Convert a Role.id role field to the Job Title display name.
              if (oldRole && uu.role === oldRole.id) uu.role = oldRole.name;
              // No lost rule.* access: ensure the union of this user's
              // mappings covers the old role's rule.* caps by expanding one.
              if (oldRole) {
                const wantRule = oldRole.capabilities.filter((c) => CATEGORY_SCOPABLE_CAPABILITIES.includes(c));
                const mine = (s.userAccessMappings ?? []).filter((m) => m.userId === uu.id);
                const have = new Set(mine.flatMap((m) => m.capabilities));
                const missing = wantRule.filter((c) => !have.has(c));
                if (missing.length && mine.length) {
                  mine[0].capabilities = Array.from(new Set([...mine[0].capabilities, ...missing]));
                }
              }
              delete uu.permissions;
            }
          }

          // currentUser: add userId, convert a Role.id role field to name.
          if (s.currentUser) {
            const cu = s.currentUser as CurrentUser & { userId?: string };
            const matchUser = (s.users ?? []).find((u) => u.name === cu.name);
            if (matchUser && !cu.userId) cu.userId = matchUser.id;
            const cuRole = roleById.get(cu.role);
            if (cuRole) cu.role = cuRole.name;
          }

          // Dashboards: re-key from old roleId to userId (matching
          // role.personaName === user.name); keep already-user-keyed entries.
          if (s.dashboardConfigs) {
            const next: Record<string, DashboardConfig> = {};
            for (const [key, cfg] of Object.entries(s.dashboardConfigs)) {
              const c = cfg as DashboardConfig & { roleId?: string };
              const asUser = (s.users ?? []).find((u) => u.id === key);
              if (asUser) {
                next[key] = { ...c, userId: key };
                continue;
              }
              const oldRole = roleById.get(key);
              const user = oldRole ? (s.users ?? []).find((u) => u.name === oldRole.personaName) : undefined;
              if (user) next[user.id] = { ...c, userId: user.id };
            }
            s.dashboardConfigs = next;
          }

          delete s.roles;
          delete s.productAccessConfigs;
        }

        // v46 -> v47 seeded User Access Mapping with demo grants
        // (DEFAULT_USER_ACCESS_MAPPINGS) spanning every user and all 7 rule
        // categories, so the now-single main table on User Management shows
        // real, working data out of the box instead of "No access assigned
        // yet." Only backfills when the array is still empty, so an admin
        // who already added/edited their own access rows keeps them.
        {
          const s = persistedState as Partial<AppState>;
          if (s && (!s.userAccessMappings || s.userAccessMappings.length === 0)) {
            s.userAccessMappings = DEFAULT_USER_ACCESS_MAPPINGS;
          }
        }

        // v45 -> v46 dropped AppUser.permissions — the global per-user
        // System Permissions list on the old User Roster table. It was
        // never actually read anywhere except that roster's own display/
        // CSV export (hasCapability() only ever checks Role.capabilities
        // via currentUser.role, never a roster user's permissions), so
        // removing it doesn't change any real enforcement. User Access
        // Mapping (per-user/per-product/per-category capabilities) is now
        // the only place System Permissions are assigned. approvalCategories
        // stays — that one IS enforced, in approveRule/rejectRule.
        {
          const s = persistedState as Partial<AppState>;
          if (s?.users) {
            s.users = s.users.map((u) => {
              const legacy = u as AppUser & { permissions?: unknown };
              if (!("permissions" in legacy)) return u;
              const { permissions: _permissions, ...rest } = legacy;
              return rest;
            });
          }
        }

        // v44 -> v45 stripped `categories` off JobTitle — a Job Title is now
        // just a reusable name for the Job Title dropdown in Add/Edit User,
        // no longer a rule-category bundle. A user's approval categories are
        // chosen directly on the user record (the existing Category
        // checklist in Add/Edit User), independent of which Job Title they
        // have. Drops the field if present; nothing to backfill since name
        // and id are untouched.
        {
          const s = persistedState as Partial<AppState>;
          if (s?.jobTitles) {
            s.jobTitles = s.jobTitles.map((jt) => {
              const legacy = jt as JobTitle & { categories?: string[] };
              if (!("categories" in legacy)) return jt;
              const { categories: _categories, ...rest } = legacy;
              return rest;
            });
          }
        }

        // v43 -> v44 reworked User Access Mapping's per-user/per-product/
        // per-category permission from a flat Read/Write toggle to a
        // multi-select of the six category-scopable capabilities
        // (CATEGORY_SCOPABLE_CAPABILITIES in capabilities.ts), so an admin
        // can grant e.g. rule.edit + rule.simulate without also implying
        // rule.publish. Any row still in the old shape maps Read ->
        // [rule.view] and Write -> [rule.view, rule.create, rule.edit] as
        // the closest equivalent; rows already migrated (no `permission`
        // field) are left untouched.
        {
          const s = persistedState as Partial<AppState>;
          if (s?.userAccessMappings) {
            s.userAccessMappings = s.userAccessMappings.map((m) => {
              const legacy = m as UserProductAccess & { permission?: "Read" | "Write" };
              if (!legacy.permission) return m;
              const { permission, ...rest } = legacy;
              return {
                ...rest,
                capabilities: permission === "Write" ? ["rule.view", "rule.create", "rule.edit"] : ["rule.view"],
              };
            });
          }
        }

        // v42 -> v43 originally reworked Job Titles from a System
        // Permissions (Capability[]) bundle to a Rule Category (string[])
        // bundle. That category concept was itself removed in v45 (a Job
        // Title is now just a name — see below), so this step's only
        // remaining job is stripping a leftover `capabilities` field from
        // an even older persisted shape.
        {
          const s = persistedState as Partial<AppState>;
          if (s?.jobTitles) {
            s.jobTitles = s.jobTitles.map((jt) => {
              const legacy = jt as JobTitle & { capabilities?: unknown };
              if (!("capabilities" in legacy)) return jt;
              const { capabilities: _capabilities, ...rest } = legacy;
              return rest;
            });
          }
        }

        // v41 -> v42 seeded Job Titles & Permissions from the 6 distinct
        // role+permissions pairs already in use on the User Management
        // roster (DEFAULT_JOB_TITLES) — previously jobTitles started empty,
        // so an existing browser session showed "No job titles found" even
        // though every seeded user already had a named role and a
        // permission set. Only backfills when the array is still empty, so
        // an admin who already added/edited their own job titles keeps them.
        {
          const s = persistedState as Partial<AppState>;
          if (s && (!s.jobTitles || s.jobTitles.length === 0)) {
            s.jobTitles = DEFAULT_JOB_TITLES;
          }
        }

        // v40 -> v41 fixed a content mismatch: Kavita Rao (Credit/Risk
        // Manager) and Arjun Nair (Underwriter/Claims) had approvalCategories
        // that didn't match their job title (Arjun could approve "Risk &
        // Fraud"/"Collateral" but not "Underwriting" — confusing in a demo).
        // Re-seeds both users' approvalCategories from DEFAULT_USERS by id,
        // leaving every other user (and any custom user an admin added)
        // untouched.
        {
          const s = persistedState as Partial<AppState>;
          if (s?.users) {
            const defaultsById = new Map(DEFAULT_USERS.map((u) => [u.id, u]));
            for (const user of s.users) {
              const seed = defaultsById.get(user.id);
              if (seed && (user.id === "usr-kavita-rao" || user.id === "usr-arjun-nair")) {
                user.approvalCategories = seed.approvalCategories;
              }
            }
          }
        }

        // v39 -> v40 wired the Field Catalog to the Entity Catalog: every seed
        // field now carries an `entity` reference (previously all undefined,
        // which made Entity Catalog's field counts and Rule Builder's
        // attribute-panel grouping look empty in a demo), and added two
        // entities (Credit Card Account, Investment Account) so Credit
        // Cards/Wealth fields have somewhere to attach.
        {
          const s = persistedState as Partial<AppState>;
          if (s?.entities) {
            const existingEntityIds = new Set(s.entities.map((e) => e.id));
            for (const entity of DEFAULT_ENTITIES) {
              if (!existingEntityIds.has(entity.id)) s.entities.push(entity);
            }
          }
          if (s?.fieldCatalog) {
            const defaultsByKey = new Map(DEFAULT_FIELD_CATALOG.map((f) => [f.key, f]));
            for (const field of s.fieldCatalog) {
              if (!field.entity) {
                const seed = defaultsByKey.get(field.key);
                if (seed?.entity) field.entity = seed.entity;
              }
            }
          }
        }

        // v38 -> v39 added RL-514 ("Personal Loan Liability-Adjusted Final
        // Amount") — the third hop in the Personal Loan chain (RL-501 →
        // RL-502 → RL-514), deducting monthly liabilities from
        // pl_eligible_amount to produce approved_loan_amount — and its
        // product mapping (order 3, before the RL-508 fee waiver which
        // shifts to order 4).
        {
          const s = persistedState as Partial<AppState>;
          if (s?.rules && !s.rules.some((r) => r.id === "RL-514")) {
            const rule = ALL_RULES.find((r) => r.id === "RL-514");
            if (rule) s.rules.push(rule);
          }
          if (s?.productRuleMappings) {
            const existingPairs = new Set(s.productRuleMappings.map((m) => `${m.productId}:${m.ruleId}`));
            const mappingDef = DEFAULT_PRODUCT_RULE_MAPPINGS.find(
              (m) => m.productId === "prod-personal-loan" && m.ruleId === "RL-514"
            );
            if (mappingDef && !existingPairs.has(`${mappingDef.productId}:${mappingDef.ruleId}`)) {
              s.productRuleMappings.push(mappingDef);
            }
            // Keep the fee waiver running last now that RL-514 is spliced in.
            const feeWaiver = s.productRuleMappings.find(
              (m) => m.productId === "prod-personal-loan" && m.ruleId === "RL-508"
            );
            if (feeWaiver) feeWaiver.order = 4;
          }
        }

        // v37 -> v38 migrated RL-116 ("Interest Rate Determination") from
        // its temporary IF-condition + Bracket Lookup THEN action to a
        // native CASE rule (caseWhens + caseElseActions), now that the Rule
        // Builder has a dedicated CASE Builder mode. Replaces the persisted
        // RL-116 in place so browsers that already seeded the old shape
        // pick up the migration instead of showing stale data forever.
        {
          const s = persistedState as Partial<AppState>;
          if (s?.rules) {
            const idx = s.rules.findIndex((r) => r.id === "RL-116");
            const migrated = ALL_RULES.find((r) => r.id === "RL-116");
            if (idx !== -1 && migrated) s.rules[idx] = migrated;
          }
        }

        // v36 -> v37 added 5 rejected-outcome demo simulations (SIM-DEMO-1…5)
        // so the "Failed Simulations" KPI (Underwriter/Operations dashboards)
        // and Product Workspace's Simulation History tab show real data
        // instead of empty. Each reuses a real ACTIVE reject rule with a
        // full, faithful evaluation trace — see DEFAULT_SIMULATIONS.
        {
          const s = persistedState as Partial<AppState>;
          if (s?.simulations) {
            const existingIds = new Set(s.simulations.map((sim) => sim.id));
            for (const sim of DEFAULT_SIMULATIONS) {
              if (!existingIds.has(sim.id)) s.simulations.push(sim);
            }
          }
        }

        // v35 -> v36 added the maker-checker demo pack (RL-509…RL-513, each
        // status "Testing" with a matching Pending Review approval request)
        // so "Rules Awaiting Review" / "Pending Review" / "Approval Queue"
        // show real demo data instead of an empty state. Not mapped to any
        // product, so no live simulator outcome changes. Audit log entries
        // are seed-only (not retro-migrated here, since splicing into an
        // already-persisted hash-chained auditLog would require rehashing
        // the whole chain — out of scope for this fix).
        {
          const s = persistedState as Partial<AppState>;
          if (s?.rules) {
            const existingIds = new Set(s.rules.map((r) => r.id));
            for (const id of ["RL-509", "RL-510", "RL-511", "RL-512", "RL-513"]) {
              if (!existingIds.has(id)) {
                const rule = ALL_RULES.find((r) => r.id === id);
                if (rule) s.rules.push(rule);
              }
            }
          }
          if (s?.approvalRequests) {
            const existingIds = new Set(s.approvalRequests.map((a) => a.id));
            for (const ar of DEFAULT_APPROVAL_REQUESTS) {
              if (!existingIds.has(ar.id)) s.approvalRequests.push(ar);
            }
          }
        }

        // v34 -> v35 removed the "demo-scenarios" widget from the
        // Underwriter role's default widget set too — same reasoning as the
        // Business Analyst removal in v33->v34 below.
        {
          const s = persistedState as Partial<AppState>;
          const uwConfig = s?.dashboardConfigs?.underwriter;
          if (uwConfig?.widgets) {
            uwConfig.widgets = uwConfig.widgets.filter((w) => w.id !== "demo-scenarios");
          }
        }

        // v33 -> v34 removed the "demo-scenarios" widget (industry-level
        // canned simulator presets — demo/sales content, not a BA workflow
        // tool, and redundant with the "Run Simulator" quick action already
        // on that dashboard) from the Business Analyst role's default
        // widget set. Only touches that one widget entry, not the rest of
        // any admin customization to this role's layout.
        {
          const s = persistedState as Partial<AppState>;
          const baConfig = s?.dashboardConfigs?.["business-analyst"];
          if (baConfig?.widgets) {
            baConfig.widgets = baConfig.widgets.filter((w) => w.id !== "demo-scenarios");
          }
        }

        // v32 -> v33 standardized every role's dashboard KPI count to exactly
        // 6 (previously 4-5, inconsistent per role) so the KPI grid always
        // divides evenly at every breakpoint with no trailing dead space —
        // overwrite each role's `kpis` list with the new default even if the
        // role's dashboardConfigs entry already exists, since the count
        // itself (not a user customization) was the bug.
        {
          const s = persistedState as Partial<AppState>;
          if (s?.dashboardConfigs) {
            for (const [roleId, config] of Object.entries(s.dashboardConfigs)) {
              const defaults = DEFAULT_DASHBOARD_CONFIGS[roleId];
              if (defaults && config.kpis?.length !== 6) {
                config.kpis = defaults.kpis;
              }
            }
          }
        }

        // v31 -> v32 added the enterprise demo rule pack (RL-501…RL-508: nested
        // AND/OR groups, calculated variables, RL-501→RL-502 chaining), the
        // Personal Loan product, and its sequenced mappings.
        {
          const s = persistedState as Partial<AppState>;
          if (s?.rules) {
            const existingIds = new Set(s.rules.map((r) => r.id));
            for (const id of ["RL-501", "RL-502", "RL-503", "RL-504", "RL-505", "RL-506", "RL-507", "RL-508"]) {
              if (!existingIds.has(id)) {
                const rule = ALL_RULES.find((r) => r.id === id);
                if (rule) s.rules.push(rule);
              }
            }
          }
          if (s?.products && !s.products.some((p) => p.id === "prod-personal-loan")) {
            const product = DEFAULT_PRODUCTS.find((p) => p.id === "prod-personal-loan");
            if (product) s.products.push(product);
          }
          if (s?.productRuleMappings) {
            const existingPairs = new Set(s.productRuleMappings.map((m) => `${m.productId}:${m.ruleId}`));
            for (const mappingDef of DEFAULT_PRODUCT_RULE_MAPPINGS.filter((m) => m.productId === "prod-personal-loan")) {
              if (!existingPairs.has(`${mappingDef.productId}:${mappingDef.ruleId}`)) {
                s.productRuleMappings.push(mappingDef);
              }
            }
          }
        }

        // v30 -> v31 added RL-113 demo rule (Composite Personal Loan Risk Gate) and its mapping
        {
          const s = persistedState as Partial<AppState>;
          if (s?.rules) {
            const existingIds = new Set(s.rules.map((r) => r.id));
            if (!existingIds.has("RL-113")) {
              const rule = ALL_RULES.find((r) => r.id === "RL-113");
              if (rule) s.rules.push(rule);
            }
          }
          if (s?.productRuleMappings) {
            const existingMapping = s.productRuleMappings.find(
              (m) => m.productId === "prod-auto-loan" && m.ruleId === "RL-113"
            );
            if (!existingMapping) {
              const mappingDef = DEFAULT_PRODUCT_RULE_MAPPINGS.find(
                (m) => m.productId === "prod-auto-loan" && m.ruleId === "RL-113"
              );
              if (mappingDef) s.productRuleMappings.push(mappingDef);
            }
          }
        }

        // v29 -> v30 added 5 new rules (RL-112, RL-209, RL-308, RL-605, RL-705) and mappings
        {
          const s = persistedState as Partial<AppState>;
          if (s?.rules) {
            const existingIds = new Set(s.rules.map((r) => r.id));
            const newRuleIds = ["RL-112", "RL-209", "RL-308", "RL-605", "RL-705"];
            for (const id of newRuleIds) {
              if (!existingIds.has(id)) {
                const rule = ALL_RULES.find((r) => r.id === id);
                if (rule) s.rules.push(rule);
              }
            }
          }
          if (s?.productRuleMappings) {
            const existingPairs = new Set(s.productRuleMappings.map((m) => `${m.productId}:${m.ruleId}`));
            const targetMappings = [
              { productId: "prod-auto-loan", ruleId: "RL-112" },
              { productId: "prod-term-life", ruleId: "RL-209" },
              { productId: "prod-gold-loan", ruleId: "RL-308" },
              { productId: "prod-credit-card", ruleId: "RL-605" },
              { productId: "prod-wealth-plan", ruleId: "RL-705" },
            ];
            for (const target of targetMappings) {
              if (!existingPairs.has(`${target.productId}:${target.ruleId}`)) {
                const mappingDef = DEFAULT_PRODUCT_RULE_MAPPINGS.find(
                  (m) => m.productId === target.productId && m.ruleId === target.ruleId
                );
                if (mappingDef) s.productRuleMappings.push(mappingDef);
              }
            }
          }
        }

        // v28 -> v29 added 'RL-110' demo rule (Home Loan Eligibility – Standard Approval),
        // updated its product rule mapping for Home Loan, and added 'Government' option
        // to employment_type and 'Ahmedabad' option to city in fieldCatalog.
        {
          const s = persistedState as Partial<AppState>;
          if (s?.fieldCatalog) {
            s.fieldCatalog = s.fieldCatalog.map((field) => {
              if (field.key === "employment_type" && !field.options?.includes("Government")) {
                return { ...field, options: [...(field.options || []), "Government"] };
              }
              if (field.key === "city" && !field.options?.includes("Ahmedabad")) {
                const opts = field.options || [];
                const otherIdx = opts.indexOf("Other");
                const newOpts = [...opts];
                if (otherIdx !== -1) {
                  newOpts.splice(otherIdx, 0, "Ahmedabad");
                } else {
                  newOpts.push("Ahmedabad");
                }
                return { ...field, options: newOpts };
              }
              return field;
            });
          }
          if (s?.rules) {
            const existingIds = new Set(s.rules.map((r) => r.id));
            if (!existingIds.has("RL-110")) {
              const rule = ALL_RULES.find((r) => r.id === "RL-110");
              if (rule) s.rules.push(rule);
            }
          }
          if (s?.productRuleMappings) {
            const existingMapping = s.productRuleMappings.find(
              (m) => m.productId === "prod-home-loan" && m.ruleId === "RL-110"
            );
            if (!existingMapping) {
              const mappingDef = DEFAULT_PRODUCT_RULE_MAPPINGS.find(
                (m) => m.productId === "prod-home-loan" && m.ruleId === "RL-110"
              );
              if (mappingDef) s.productRuleMappings.push(mappingDef);
            }
          }
        }

        // v27 -> v28 capped auditLog going forward (see AUDIT_LOG_CAP /
        // logAudit, audit finding A7) — trim an already-oversized persisted
        // session once here too, since the cap in logAudit only applies on
        // the next new entry, not to a session that's already over it.
        {
          const s = persistedState as Partial<AppState>;
          if (s?.auditLog && s.auditLog.length > AUDIT_LOG_CAP) {
            s.auditLog = s.auditLog.slice(0, AUDIT_LOG_CAP);
          }
        }
        // v26 -> v27 replaced the "Review Required" outcome's old detection
        // (a Show Message action whose free-text message happened to contain
        // the word "review") with a first-class "Flag for Review" ActionType
        // (audit finding A2 — that string-matching silently mis-fired on any
        // unrelated message containing "review"). Upgrade every already-
        // persisted rule/template's actions and elseActions in place so
        // existing sessions keep behaving the same, now driven by the
        // action's actual type instead of a text-sniffing heuristic.
        {
          const s = persistedState as Partial<AppState>;
          const upgradeActions = (actions?: { type: string; message?: string }[]) => {
            actions?.forEach((a) => {
              if (a.type === "Show Message" && a.message?.toLowerCase().includes("review")) {
                a.type = "Flag for Review";
              }
            });
          };
          s?.rules?.forEach((r) => {
            upgradeActions(r.actions);
            upgradeActions(r.elseActions);
          });
          s?.ruleTemplates?.forEach((t) => {
            upgradeActions(t.actions);
            upgradeActions(t.elseActions);
          });
        }
        // v25 -> v26 added `lookupType` to DecisionMatrix so matrix lookups
        // resolve generically by domain instead of a hardcoded matrix id
        // (audit finding A3/A4) — backfill onto the 3 seeded matrices by id
        // since a persisted session's `matrices` array won't pick up a new
        // field on an existing row from the default shallow merge.
        {
          const s = persistedState as Partial<AppState>;
          const lookupTypeById: Record<string, "interest-rate" | "haircut" | "premium"> = {
            "MTX-LEND-01": "interest-rate",
            "MTX-NBFC-01": "haircut",
            "MTX-INS-01": "premium",
          };
          if (s?.matrices) {
            s.matrices = s.matrices.map((m) => (m.lookupType || !lookupTypeById[m.id] ? m : { ...m, lookupType: lookupTypeById[m.id] }));
          }
        }
        // v24 -> v25 built out Credit Cards and Wealth Management (previously
        // fields/rules/products/templates existed for Lending, Insurance and
        // NBFC only) plus 2 more demo Rule Templates per domain across the
        // board. New rows for a persisted session's already-diverged arrays
        // won't appear from the default shallow merge, so backfill each by id.
        {
          const s = persistedState as Partial<AppState>;
          const newFieldKeys = new Set([
            "annual_income", "requested_credit_limit", "credit_utilization_ratio",
            "existing_cards_count", "card_type_requested", "late_payment_history",
            "investment_amount", "risk_appetite", "portfolio_type", "kyc_verified",
            "net_worth", "investment_horizon_years",
          ]);
          if (s?.fieldCatalog) {
            const existingKeys = new Set(s.fieldCatalog.map((f) => f.key));
            for (const field of DEFAULT_FIELD_CATALOG) {
              if (newFieldKeys.has(field.key) && !existingKeys.has(field.key)) s.fieldCatalog.push(field);
            }
          }
          const newRuleIds = new Set(["RL-601", "RL-602", "RL-603", "RL-604", "RL-701", "RL-702", "RL-703", "RL-704"]);
          if (s?.rules) {
            const existingRuleIds = new Set(s.rules.map((r) => r.id));
            for (const rule of ALL_RULES) {
              if (newRuleIds.has(rule.id) && !existingRuleIds.has(rule.id)) s.rules.push(rule);
            }
          }
          if (s?.products) {
            const existingProductIds = new Set(s.products.map((p) => p.id));
            for (const product of DEFAULT_PRODUCTS) {
              if (!existingProductIds.has(product.id) && (product.id === "prod-credit-card" || product.id === "prod-wealth-plan")) {
                s.products.push(product);
              }
            }
          }
          if (s?.productRuleMappings) {
            const existingPairs = new Set(s.productRuleMappings.map((m) => `${m.productId}:${m.ruleId}`));
            for (const mapping of DEFAULT_PRODUCT_RULE_MAPPINGS) {
              if (newRuleIds.has(mapping.ruleId) && !existingPairs.has(`${mapping.productId}:${mapping.ruleId}`)) {
                s.productRuleMappings.push(mapping);
              }
            }
          }
          const newTemplateIds = new Set([
            "tmpl-lending-min-credit-score", "tmpl-lending-high-value-review",
            "tmpl-insurance-min-sum-assured", "tmpl-insurance-high-bmi-review",
            "tmpl-nbfc-min-purity", "tmpl-nbfc-high-value-review",
            "tmpl-creditcards-min-income", "tmpl-creditcards-high-utilization-review",
            "tmpl-wealth-min-investment", "tmpl-wealth-aggressive-review",
          ]);
          if (s?.ruleTemplates) {
            const existingTemplateIds = new Set(s.ruleTemplates.map((t) => t.id));
            for (const template of DEFAULT_RULE_TEMPLATES) {
              if (newTemplateIds.has(template.id) && !existingTemplateIds.has(template.id)) s.ruleTemplates.push(template);
            }
          }
        }
        // v23 -> v24 added a baseline "Standard ... Approval" mapping to Auto
        // Loan, Term Life Cover and Gold Loan (Home Loan already had one) so
        // every seed product has both a positive and a negative demo outcome
        // — an existing session's `productRuleMappings` already diverged from
        // the DEFAULT_PRODUCT_RULE_MAPPINGS constant, so the default shallow
        // merge won't add these; backfill them explicitly, skipping any
        // product where a mapping for that rule already exists.
        {
          const s = persistedState as Partial<AppState>;
          if (s?.productRuleMappings) {
            const additions: ProductRuleMapping[] = [
              { id: "prm-11", productId: "prod-auto-loan", ruleId: "RL-106", order: 2 },
              { id: "prm-12", productId: "prod-term-life", ruleId: "RL-207", order: 2 },
              { id: "prm-13", productId: "prod-gold-loan", ruleId: "RL-306", order: 2 },
            ].map((a) => ({ ...a, active: true, createdAt: new Date().toISOString() }));
            for (const addition of additions) {
              const alreadyMapped = s.productRuleMappings.some(
                (m) => m.productId === addition.productId && m.ruleId === addition.ruleId
              );
              if (!alreadyMapped) s.productRuleMappings.push(addition);
            }
          }
        }
        // v22 -> v23 added `recentProductIds` (Rule Simulator's "Recently
        // Used" list) — a brand-new key, the default shallow merge fills it
        // in from initial state ([]) automatically, nothing to backfill.

        // REQUIRED: zustand persist uses this return value as the migrated
        // state (merged over the fresh defaults). Without it, every version
        // bump silently discarded all persisted customization.
        return persistedState as AppState;
      },
    }
  )
);

// The effective capability set for a user = the admin caps (iff isAdmin)
// plus the union of rule.* caps across that user's Active access mappings.
// This is the single RBAC resolver — there is no Role entity anymore.
export function effectiveCapabilities(
  users: AppUser[],
  mappings: UserProductAccess[],
  userId: string
): Set<Capability> {
  const caps = new Set<Capability>();
  const user = users.find((u) => u.id === userId);
  if (!user) return caps;
  if (user.isAdmin) for (const c of ADMIN_CAPABILITIES) caps.add(c);
  for (const m of mappings) {
    if (m.userId === userId && m.status === "Active") for (const c of m.capabilities) caps.add(c);
  }
  return caps;
}

// Store-internal capability check — resolves the signed-in user from state.
function can(state: AppState, capability: Capability): boolean {
  return effectiveCapabilities(state.users, state.userAccessMappings, state.currentUser.userId).has(capability);
}

export function useEffectiveCapabilities(): Set<Capability> {
  const users = useAppStore((s) => s.users);
  const mappings = useAppStore((s) => s.userAccessMappings);
  const userId = useAppStore((s) => s.currentUser.userId);
  return effectiveCapabilities(users, mappings, userId);
}

export function useHasCapability(capability: Capability): boolean {
  return useEffectiveCapabilities().has(capability);
}

// Rules scoped to the header's Industry filter when one is active — shared
// by every dashboard widget so that filter isn't just decorative.
export function useScopedRules(): BusinessRule[] {
  const rules = useAppStore((s) => s.rules);
  const domainFilter = useAppStore((s) => s.globalFilters.domains);
  return domainFilter.length ? rules.filter((r) => domainFilter.includes(r.domain)) : rules;
}

// Products visible to the logged-in user. Access is now driven per-user
// through User Access Mapping (see effectiveCapabilities); this returns every
// product (default-allow-all) so no user is ever locked out of the Products
// Hub or Simulator picker. Per-product visibility, if ever needed, can derive
// from the user's access mappings here.
export function useAccessibleProducts(): Product[] {
  return useAppStore((s) => s.products);
}
