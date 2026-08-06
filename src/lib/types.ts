// Core domain types for the Business Rules Engine prototype.

// Industry/vertical is a configurable entity, not a fixed union — new industries
// are added via the Configuration Studio, never by editing code. `Domain` is kept
// as an alias (rather than replaced everywhere with `string`) purely to avoid a
// mass rename across the app; it now refers to an Industry.id.
export type Domain = string;

export interface Industry {
  id: string;
  name: string;
  icon: string; // lucide-react icon name, resolved via ICON_MAP at render time
  description?: string;
}

// A business entity (Applicant, Loan Account, Collateral, Policy, ...) that
// fields belong to — part of the Configuration Studio's metadata layer, not
// a fixed union. Optional `industry` scopes an entity to one vertical; leave
// unset for entities shared across every industry.
export interface Entity {
  id: string;
  name: string;
  description?: string;
  industry?: string;
}

// Maker-Checker governance lifecycle: Draft (authoring) -> Pending Approval
// (submitted with product mapping, awaiting Checker) -> Published (live,
// executes) -> plus Rejected (sent back), and Inactive (paused)/Archived
// (retired) for post-publish operational management. A rule must have >=1
// product mapping to leave Draft. Approving a Pending Approval rule
// publishes it atomically (see store.ts's approveRule) — "Approved" is kept
// in this union only for backward compatibility with already-persisted data
// from before that change; no code path produces it as a resting status.
export type RuleStatus =
  | "Draft"
  | "Pending Approval"
  | "Approved"
  | "Rejected"
  | "Published"
  | "Inactive"
  | "Archived"
  | "Pending Deletion";

// How the engine resolves multiple rules qualifying for the same case.
// "execute-all" (default, matches pre-existing behavior) evaluates every
// eligible rule regardless of order; "first-match" stops at the first rule
// whose IF (or ELSE) actually fires; "highest-priority"/"lowest-priority"
// just flip the evaluation/trace order (priority 1 = highest on the Priority
// scale) without truncating evaluation.
export type ConflictResolution = "highest-priority" | "lowest-priority" | "first-match" | "execute-all";

export interface ExecutionSettings {
  conflictResolution: ConflictResolution;
}

export type Priority = 1 | 2 | 3 | 4 | 5;

export type Operator =
  | "="
  | "!="
  | ">"
  | "<"
  | ">="
  | "<="
  | "contains"
  | "starts_with"
  | "in"
  | "between";

export type ActionType =
  | "Approve"
  | "Reject"
  | "Calculate"
  | "Assign Value"
  | "Show Message"
  | "Flag for Review"
  | "Bracket Lookup";

// How a condition/group joins with the accumulated result of its earlier
// siblings within its own parent's children array. Never meaningful for the
// first child in a group (there's nothing before it to join with) — the UI
// hides it there and the engine ignores it if somehow set. "N.A." excludes
// the item from the AND/OR fold entirely (still evaluated for trace/preview
// purposes, just not counted toward the outcome) — see evaluateGroup in engine.ts.
export type Connector = "AND" | "OR" | "N.A.";

export interface Condition {
  id: string;
  type: "condition";
  field: string;
  operator: Operator;
  value: string;
  value2?: string; // used for "between"
  prefix?: "IF" | "WHERE" | "CASE"; // condition prefix
  /** How this condition joins its earlier siblings — see `Connector`. Absent
   *  on every pre-existing rule; falls back to the parent group's `logic`. */
  connector?: Connector;
  sourceType?: "BUSINESS_FIELD" | "RULE_OUTPUT";
  sourceRuleId?: string; // Present when sourceType === "RULE_OUTPUT"
  rhsType?: "STATIC" | "FIELD_REFERENCE";
  rhsSourceType?: "BUSINESS_FIELD" | "RULE_OUTPUT";
  rhsSourceRuleId?: string; // Present when rhsSourceType === "RULE_OUTPUT"
}

export interface ConditionGroup {
  id: string;
  type: "group";
  /** Legacy uniform AND/OR — kept only as the backward-compatible fallback
   *  for children with no explicit `connector` (i.e. every rule saved before
   *  per-child connectors existed). New authoring sets `connector` on each
   *  child directly instead; this field is no longer surfaced in the UI. */
  logic: "AND" | "OR";
  collapsed?: boolean;
  /** How this group itself joins its earlier siblings when it's a nested
   *  child of another group — see `Connector`. Same meaning as
   *  Condition.connector — lets a nested group have its own relation to the
   *  sibling before it, independent of its own children's logic. */
  connector?: Connector;
  children: (Condition | ConditionGroup)[];
}

/** One range in a "Bracket Lookup" action — e.g. credit score 750-799 → 8.75. */
export interface RuleBracket {
  id: string;
  min: number;
  max: number; // inclusive
  outputValue: string; // resolved value for this bracket, coerced same as Assign Value
}

export interface RuleAction {
  id: string;
  type: ActionType;
  outputTarget?: "BUSINESS_FIELD" | "RUNTIME_VARIABLE";
  outputField?: string;
  outputVariable?: string;
  outputValue?: string;
  /** Data type metadata for a generated variable (Calculate/Assign Value only) — informs the Output Field picker/Rule Preview, not used for coercion at execution time. */
  outputType?: FieldDataType;
  reasonCode?: string;
  message?: string;
  /** Bracket Lookup only — the field whose value is tested against each
   *  bracket's [min,max] to resolve outputField. Lets a single rule resolve
   *  one of several range-based outputs (e.g. credit score → interest rate)
   *  without unsafe eval — Calculate's expression language is deliberately
   *  arithmetic-only and can't branch. */
  bracketField?: string;
  brackets?: RuleBracket[];
}

// FUTURE: Environment promotion (Dev → UAT → Prod) is intentionally removed
// for the demo. When reintroducing, restore the type below and re-add the
// `environment` field to BusinessRule, engine eligibility checks, and UI.
// export type RuleEnvironment = "Dev" | "UAT" | "Prod";

/** Cosmetic classification for display (Rule Repository badge, Execution Plan
 *  chips, Simulator ruleExecution.ruleType) — NOT consumed by the engine,
 *  which always evaluates rootGroup as one AND/OR tree regardless of this tag
 *  (same precedent as the existing Condition.prefix). */
export type RuleType = "IF" | "WHERE" | "CASE" | "GROUP";

/** One WHEN → THEN branch of a rule's optional CASE Builder — a purely
 *  additive, self-contained sibling to the IF/WHERE/GROUP condition tree
 *  (rootGroup/actions/elseActions), not a replacement for it. A rule can
 *  have a normal condition tree AND a CASE block at the same time. */
export interface CaseWhenClause {
  id: string;
  field: string;
  operator: Operator;
  value: string;
  value2?: string; // used for "between", same convention as Condition.value2
  outputField: string;
  outputValue: string;
}

export interface BusinessRule {
  id: string; // e.g. RL-101
  name: string;
  domain: Domain;
  category: string;
  subCategory?: string;
  /** Optional membership in a configurable Rule Group/Collection — independent
   *  of Category, purely organizational (e.g. "Digital Lending — Core Eligibility").
   *  Rule Builder's own save validation requires this going forward; kept optional
   *  here at the type level so the 121 pre-existing seed/filler rules (authored
   *  before this requirement) don't need a disruptive mass-migration. */
  groupId?: string;
  /** Execution order within `groupId`, unique per group (e.g. 1, 2, 3…) — a
   *  distinct concept from `priority` (a P1–P5 classification that already
   *  drives Simulator evaluation order across an entire industry). `sequence`
   *  is Rule Builder/Rule-Group-scoped: it's what lets one rule's output feed
   *  the next rule's input within the same group (see src/lib/rule-chaining.ts).
   *  Enforced unique/required by Rule Builder's validation, not a DB constraint. */
  sequence?: number;
  /** Optional display-only classification (IF/WHERE/CASE/GROUP) — see RuleType. */
  ruleType?: RuleType;
  priority: Priority;
  status: RuleStatus;
  /** Who authored the rule — set on create, used for Maker-Checker
   *  segregation of duties (the approver may not be the creator). */
  createdBy?: string;
  // environment: RuleEnvironment; // FUTURE: restore when environment promotion is reintroduced
  description?: string;
  owner: string;
  rootGroup: ConditionGroup;
  actions: RuleAction[]; // THEN
  /** ELSE — fires instead of `actions` when rootGroup does NOT match. Optional; a rule with no elseActions simply does nothing on a non-match, same as before this existed. */
  elseActions?: RuleAction[];
  createdAt: string;
  updatedAt: string;
  version: number;
  /** Whether this rule participates in the Rule Simulator evaluation engine.
   *  Hand-authored demo rules are simulatable; bulk-generated filler rules
   *  (added purely for repository/dashboard scale) are not. */
  simulatable?: boolean;
  /** Optional CASE Builder block. When `caseWhens` has entries, the Rule
   *  Builder UI shows ONLY the CASE Builder (hiding the normal condition
   *  tree / THEN Action Builder / ELSE — Otherwise) — the CASE Builder is
   *  the complete rule in that mode, not an addition alongside the tree. */
  caseWhens?: CaseWhenClause[];
  /** CASE Builder's single final ELSE — fires when no WHEN clause matches.
   *  Reuses the same RuleAction shape (and the same ActionListEditor UI)
   *  as the normal rule's `actions`/`elseActions`. */
  caseElseActions?: RuleAction[];
}

// A full, immutable snapshot of a rule's definition at the moment it was
// saved — content only (name/category/conditions/actions/etc.), not lifecycle
// status. Enables real "what changed" history and rollback, instead of the
// bare version counter this replaces: every content edit appends one of
// these rather than silently overwriting the prior definition in place.
export interface RuleVersion {
  ruleId: string;
  version: number;
  snapshotAt: string;
  snapshotBy: string;
  /** How this snapshot came to exist — a normal edit, or a restore of an older version. */
  changeType: "created" | "edited" | "restored";
  /** When changeType is "restored", the version number that was restored. */
  restoredFromVersion?: number;
  name: string;
  category: string;
  subCategory?: string;
  groupId?: string;
  sequence?: number;
  priority: Priority;
  owner: string;
  description?: string;
  rootGroup: ConditionGroup;
  actions: RuleAction[];
  elseActions?: RuleAction[];
}

// A named, reusable collection of rules — purely organizational, orthogonal to
// Category. Configurable from the Configuration Studio, never hardcoded.
// Also doubles as "Rule Set" in Execution Manager below — a RuleGroup IS a
// Rule Set; no separate duplicate entity.
export interface RuleGroup {
  id: string;
  name: string;
  description?: string;
}

// ============================================================
// Product Master + Product-Rule Mapping — replaces Execution Manager's
// group/mapping-based routing below (kept, unrouted, for one release as a
// rollback path — see engine.ts/execution-manager.ts comments). A Product is
// just a configurable named scheme (Home Loan, Auto Loan, ...); a client can
// offer many. Rules stay standalone entities — a Product never embeds rule
// logic, it only points at which already-existing rules apply to it via
// ProductRuleMapping (many-to-many).
// ============================================================

export interface Product {
  id: string;
  name: string;
  /** Stable machine key used to identify the product from an incoming request, e.g. "HOME_LOAN". */
  code: string;
  domain: Domain;
  description?: string;
  status: "Active" | "Inactive";
  /** Publish lifecycle for the Product Workspace's guided journey — separate
   *  from `status` (which gates execution eligibility). Missing on legacy
   *  rows is treated as "Draft" (see store.ts migration). */
  publishStatus?: "Draft" | "Published";
  lastPublishedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// One row per (product, rule) pairing — many-to-many. `active` lets a mapping
// be soft-unmapped without losing the history of what was once wired up.
export interface ProductRuleMapping {
  id: string;
  productId: string;
  ruleId: string;
  active: boolean;
  /** Execution position among this product's mapped rules — the Rule
   *  Sequencer for product-based execution/chaining. Missing on legacy rows
   *  (falls back to rule priority; see product-rule-engine.ts). */
  order?: number;
  /** Optional date the mapping takes effect — captured in the Map-to-Product
   *  dialog during rule submission. Display/governance only in this prototype. */
  effectiveDate?: string;
  /** Optional free-text note captured alongside the mapping at submission. */
  remarks?: string;
  createdAt: string;
  createdBy?: string;
}

// A submitted customer application, addressable by a human-facing Application
// ID (e.g. "APP000124"). Powers the Rule Simulator's Application-ID mode:
// enter an ID, auto-identify its Product, run its data through that product's
// mapped rules. In production this would be fetched from the originating LOS/
// core system; this prototype has no backend, so DEFAULT_APPLICATIONS seeds a
// representative set (client-side, like DEFAULT_PRODUCTS). `fields` is keyed by
// Field-Catalog keys — the SAME shape as SimulationResult.input — so it feeds
// the existing execution engine with zero transformation. `applicantName` and
// `status` are display-only identity, never passed to the engine.
export type ApplicationStatus = "Submitted" | "Under Review" | "Pending Documents";

export interface LoanApplication {
  id: string;
  productId: string;
  applicantName: string;
  status: ApplicationStatus;
  submittedAt: string;
  fields: Record<string, string | number | boolean>;
}

// ============================================================
// Execution Manager types removed — system deprecated/deleted.
// ============================================================

export type ExecutionMode = "sequential" | "parallel" | "stop-on-first-match" | "execute-all" | "conditional";


// A configurable rule category — BusinessRule.category stores this entry's
// `name` (a plain string), not `id`, so existing filters/columns/CSV export
// that already treat category as a display string keep working unchanged.
export interface RuleCategory {
  id: string;
  name: string;
  description?: string;
  industry?: string;
}

// A reusable starting shape for a common rule pattern (e.g. "Threshold
// Check"). Instantiating a template just pre-fills the Rule Builder; the
// resulting rule is a normal, fully editable BusinessRule.
export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  /** Optional — scopes the field picker while authoring and which industry's
   *  "Start from a Template" list shows this template. Unset = shown for every industry. */
  domain?: Domain;
  /** Optional — links to a RuleCategory so templates can be grouped/filtered by purpose. */
  categoryId?: string;
  rootGroup: ConditionGroup;
  actions: RuleAction[];
  elseActions?: RuleAction[];
}

export interface MatrixColumn {
  key: string;
  label: string;
  type: "text" | "number" | "percent" | "currency" | "select";
  options?: string[];
  unit?: string;
}

export interface MatrixRow {
  id: string;
  values: Record<string, string | number>;
}

export interface DecisionMatrix {
  id: string;
  domain: Domain;
  name: string;
  description: string;
  columns: MatrixColumn[];
  rangeColumns?: [string, string]; // [minKey, maxKey] used for overlap detection
  rows: MatrixRow[];
  updatedAt: string;
  /** Which lookup shape this matrix's rows follow — lets the engine resolve
   *  a matrix generically by `domain` instead of a hardcoded matrix id, and
   *  lets a new industry plug in matrix pricing via configuration alone (add
   *  a DecisionMatrix with this domain + shape, no code change). Undefined
   *  means "no automatic post-decision lookup for this matrix." */
  lookupType?: "interest-rate" | "haircut" | "premium";
}

// "list" stays part of this shared union for JSON Mapping's own attribute
// type inference/selection (src/lib/json-mapping.ts) — BusinessField itself
// no longer offers it (Field Catalog's own type dropdown excludes it), since
// nothing consumes a list-typed BusinessField anymore now that Quantifier
// conditions have been removed.
export type FieldDataType = "number" | "string" | "boolean" | "enum" | "currency" | "percentage" | "date" | "list";

export interface BusinessField {
  key: string;
  label: string;
  domain: Domain | "Common";
  type: FieldDataType;
  options?: string[];
  unit?: string;
  description?: string;
  /** Derived/computed fields (e.g. a ratio calculated from two other fields) are
   *  available to the Rule Builder's condition picker but excluded from the
   *  Simulator's dynamic input form since the user never enters them directly. */
  computed?: boolean;
  /** Whether the field contains PII and should be masked in UI tools/traces. */
  mask?: boolean;
  /** Whether the field is required for pre-flight simulation schema validation. */
  mandatory?: boolean;
  /** Metadata-repository fields — part of the Configuration Studio's Field
   *  Catalog upgrade, all optional so pre-existing seed data keeps working. */
  businessName?: string;
  /** Entity.id reference (see Entity in this file). */
  entity?: string;
  sourceSystem?: string;
  status?: "Active" | "Draft" | "Deprecated";
  updatedAt?: string;
  updatedBy?: string;
  
  // Validation constraints
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;
  regexPattern?: string;
}

// Foundational JSON Mapping — a table-based attribute-to-field mapping set,
// built from a pasted/uploaded sample payload. Drag-and-drop visual mapping
// and OpenAPI/Swagger spec import are a later phase; this covers the core
// "map an external JSON attribute to a BRE field" need.
export interface JsonMappingEntry {
  id: string;
  externalAttribute: string;
  jsonPath: string;
  mappedField?: string; // BusinessField.key
  dataType: FieldDataType;
  required: boolean;
  transformationRule?: string;
  valueMap?: Record<string, string>;
  defaultValue?: string;
  validationRule?: string;
  status: "Mapped" | "Unmapped";
}

export interface JsonMapping {
  id: string;
  name: string;
  /** Determines which Field Catalog entries are offered for "Mapped Field" (domain-scoped, same as everywhere else). */
  industry: string;
  /** Optional — scopes this mapping to one product's integration contract. Unset = applies industry-wide (every product in `industry` shares this shape). */
  productId?: string;
  direction: "request" | "response";
  samplePayload?: string;
  entries: JsonMappingEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface TraceStep {
  ruleId: string;
  ruleName: string;
  priority: Priority;
  status: "Passed" | "Failed" | "Skipped" | "Not Applicable";
  conditionSummaries: {
    field: string;
    operator: Operator;
    expected: string;
    actual: string;
    passed: boolean;
  }[];
  actionsApplied: RuleAction[];
  durationMs: number;
  /** True when this step ran a non-Active (Testing) rule under an explicit sandbox test — never true in a normal production simulation. */
  sandbox?: boolean;
  /** Which action list actually fired — "then" on a match, "else" when the conditions failed but the rule had an ELSE branch. Absent for Skipped/Not Applicable steps. */
  branch?: "then" | "else";
  /** Assign Value/Calculate outputs this step produced (see engine.ts's applyAction) — surfaced in the Simulator's timeline/Rule Chaining Variables display. */
  producedValues?: Record<string, string | number>;
  /** Any evaluation errors encountered during this step (e.g., NaN from missing variables). */
  errors?: string[];
}

export type DecisionOutcome = "Approved" | "Rejected" | "Review Required";

export interface SimulationResult {
  id: string;
  domain: Domain;
  /** The Product this run was executed against, when run from a Product
   *  context (Product Workspace's Run Simulator tab, or /simulator with
   *  ?productId=) — absent for older/domain-only runs. */
  productId?: string;
  outcome: DecisionOutcome;
  reasonCode: string;
  summary: string;
  calculatedValues: Record<string, string | number>;
  triggeredRules: string[];
  decidingRuleId: string | null;
  trace: TraceStep[];
  input: Record<string, string | number | boolean | (string | number | boolean)[]>;
  timestamp: string;
  totalDurationMs: number;
  /** True when one or more Testing-stage rules were included via an explicit sandbox test — this result is a pre-approval preview, not a production decision. */
  sandbox?: boolean;
}

// Batch Testing (Excel upload) — a summary-only audit record of one batch
// run. Deliberately excludes per-row results: a 10,000-row batch's full
// result set (each with its own SimulationResult/trace) stays in the Batch
// Testing tab's component state only and is never written here, so it never
// persists into the single localStorage blob this whole store round-trips
// through (see AUDIT_LOG_CAP's comment in store.ts for why unbounded growth
// there is already a documented risk this must not add to).
export interface BatchRunSummary {
  id: string;
  productId: string;
  productName: string;
  fileName: string;
  uploadedBy: string;
  startedAt: string;
  endedAt: string;
  totalRows: number;
  passed: number;
  failed: number;
  cancelled: boolean;
  avgExecutionMs: number;
  reportDownloaded: boolean;
}

// ============================================================
// Decision Result module — a consumer-configurable response layer sitting on
// top of both engines above (plain Simulator runs and Execution Manager's
// multi-rule-set runs). DecisionResult is a normalized superset that either
// engine's output adapts into (see src/lib/decision-response.ts), so one
// shared view/config can present both, at whichever detail level
// (ResponseMode) the consumer is configured for.
// ============================================================

export type ResponseMode = "decision-only" | "decision-explanation" | "decision-trace" | "full-audit";

// One flow "lane" in a decision run — for a plain Simulator run this is a
// single synthetic step wrapping the whole flat trace; for an Execution
// Manager run it's one entry per RuleSetStepResult.
export interface DecisionFlowStep {
  id: string;
  label: string;
  mode?: ExecutionMode;
  skipped?: boolean;
  skipReason?: string;
  trace: TraceStep[];
}

export interface DecisionResult {
  id: string;
  correlationId: string;
  source: "simulation" | "execution-manager";
  domain: Domain;
  mappingId?: string;
  mappingName?: string;
  outcome: DecisionOutcome;
  reasonCode: string;
  summary: string;
  calculatedValues: Record<string, string | number>;
  triggeredRules: string[];
  decidingRuleId: string | null;
  /** ruleId -> BusinessRule.version, resolved at result-build time. */
  ruleVersions: Record<string, number>;
  flow: DecisionFlowStep[];
  /** flow[].trace concatenated in order, for callers that just want one flat list (e.g. DecisionCallout's deciding-step lookup). */
  flatTrace: TraceStep[];
  input: Record<string, string | number | boolean | (string | number | boolean)[]>;
  // environment: RuleEnvironment; // FUTURE: restore when environment promotion is reintroduced
  timestamp: string;
  totalDurationMs: number;
  sandbox?: boolean;
}

// Configurable per scope ("default" | Industry.id | RuleExecutionMapping.id
// — see decisionResponseSettings in store.ts) so a BA, a QA engineer, an
// external API, and Compliance can each get the detail level appropriate to
// them without any code change.
export interface DecisionResponseConfig {
  defaultMode: ResponseMode;
  showDecisionReason: boolean;
  showTriggeredRules: boolean;
  showFailedRules: boolean;
  showExecutionTime: boolean;
  showRuleVersion: boolean;
  showRuleSequence: boolean;
  showApiRequest: boolean;
  showApiResponse: boolean;
  enableDebugTrace: boolean;
  enableAuditLogging: boolean;
}

// ============================================================
// NotifyX — trigger -> condition -> action workflow automation. Categories
// and Triggers are configurable registries (mirrors RuleCategory/Industry);
// action types/operators/delay presets are a small fixed vocabulary (mirrors
// RuleAction's closed ActionType union) — see src/lib/notify-vocabulary.ts.
// Recipients are computed live from the `roles` registry, not stored here.
// ============================================================
export type NotifyWorkflowStatus = "Draft" | "Active" | "Paused";

export interface NotifyCategory {
  id: string;
  name: string;
  /** Keys into the color-token map in notify-vocabulary.ts (light + dark classes). */
  colorToken: string;
}

export interface NotifyTrigger {
  id: string;
  label: string;
  categoryId: string;
}

export type NotifyActionType =
  | "Send Email"
  | "Send In-App Notification"
  | "Send WhatsApp Message"
  | "Notify Stakeholders"
  | "Create Follow-up Task"
  | "Create Escalation"
  | "Change Status";

export type NotifyOperator = "is" | "is not" | "contains";

export type NotifyStep =
  | { id: string; kind: "condition"; field: string; operator: NotifyOperator; value: string }
  | { id: string; kind: "action"; actionType: NotifyActionType; recipient: string; message?: string }
  | { id: string; kind: "wait"; duration: string };

export interface NotifyExecutionLog {
  id: string;
  timestamp: string;
  description: string;
  result: "Success" | "Failed" | "Skipped";
}

export interface NotifyWorkflow {
  id: string;
  name: string;
  categoryId: string;
  triggerId: string;
  status: NotifyWorkflowStatus;
  steps: NotifyStep[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  /** Runtime rollups — this is a config-only prototype (no execution engine), so these are
   *  seeded/static, never incremented by real triggers. See NOTIFYX_BLUEPRINT gap G-08/G-22. */
  runCount: number;
  logs: NotifyExecutionLog[];
}

export interface NotifyWorkflowTemplate {
  id: string;
  name: string;
  categoryId: string;
  triggerId: string;
  steps: NotifyStep[];
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  /** Hash of the entry immediately before this one in time ("" for the very first entry ever logged). */
  prevHash: string;
  /** This entry's own hash, computed from prevHash + its own fields — see audit-chain.ts. Forms a tamper-evident (not tamper-proof) chain. */
  hash: string;
  /** Structured decision-run context — present only when this entry logs a Simulator/Execution Manager
   *  run under a DecisionResponseConfig with enableAuditLogging on. Deliberately NOT part of
   *  hashAuditEntry's payload (see audit-chain.ts) so the existing tamper-evidence chain and every
   *  pre-existing entry keep verifying unchanged regardless of this field's presence. */
  decisionContext?: {
    correlationId: string;
    // environment: RuleEnvironment; // FUTURE: restore when environment promotion is reintroduced
    triggeredRules: string[];
    ruleVersions: Record<string, number>;
    executionTimeMs: number;
    requestPayload: Record<string, unknown>;
    responsePayload: Record<string, unknown>;
  };
  /** Structured before/after values for access-control changes (user created/updated,
   *  permissions granted/revoked). Like decisionContext above, deliberately NOT part of
   *  hashAuditEntry's payload, so existing chains keep verifying — which also means it is
   *  display detail, not tamper-evident. The authoritative, hashed summary stays in `details`. */
  changes?: AuditChange[];
}

/** One field-level before/after pair on an access-control audit entry. */
export interface AuditChange {
  field: string;
  oldValue: string;
  newValue: string;
}

// The fixed, universal capability vocabulary (mirrors BRD §5.4's RBAC matrix
// columns). Which *roles* grant which capabilities is metadata, configurable
// via the Configuration Studio — this list itself is the one closed vocabulary
// every BRE tenant shares, the same way Operator/ActionType are closed.
export type Capability =
  | "rule.view"
  | "rule.create"
  | "rule.edit"
  | "rule.delete"
  | "rule.simulate"
  | "rule.publish"
  | "system.manage"
  | "config.manage"
  | "notifyx.view"
  | "notifyx.create"
  | "notifyx.edit"
  | "notifyx.toggle";

// A reusable named title (e.g. "Credit Risk Manager") that populates the
// Job Title dropdown in Add/Edit User. Purely a display label — carries no
// permissions of its own. AppUser.role stores the selected name as plain
// text; renaming/deleting a JobTitle never changes a user's access, which is
// driven entirely by their Administrator flag + User Access Mapping rows.
export interface JobTitle {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// The administration tier a user holds, if any. Deliberately NOT a single
// boolean: platform administration (users, access, permissions) and product
// administration (products, metadata, rule config) are separate duties, and
// bundling them let a Product Manager grant themselves any permission —
// see SYSTEM_ADMIN_CAPABILITIES/PRODUCT_ADMIN_CAPABILITIES in store.ts.
//   "system"  — System Administrator: the ONLY tier that may manage users,
//               access mappings and permissions (holds system.manage).
//   "product" — Product Administrator: product/metadata/rule configuration
//               only (config.manage + notifyx.*), never user or access admin.
// undefined = not an administrator at all.
export type AdminScope = "system" | "product";

// A named individual on the team's user roster. This is the single source of
// truth for access: `adminScope` grants the platform/config capabilities, and
// the user's UserProductAccess rows grant the rule.* capabilities. Enforced
// client-side only (no backend), same as the rest of this prototype.
export interface AppUser {
  id: string;
  name: string;
  email: string;
  /** Free-text Job Title label (e.g. "Credit Risk Manager") — display only,
   *  drives no permissions. */
  role: string;
  department: string;
  status: "Active" | "Inactive";
  /** Administration tier — see AdminScope above. Only "system" unlocks user
   *  and access management. rule.* capabilities come separately from the
   *  user's UserProductAccess rows, never from this field. */
  adminScope?: AdminScope;
  /** RuleCategory.name values this user is authorized to approve as part of
   *  Maker-Checker approval. Zero, one, or many — a single approver can cover
   *  multiple categories. Enforced in store.ts's approveRule/rejectRule: an
   *  empty list means unrestricted (e.g. a System Administrator persona), a
   *  non-empty list is a strict whitelist. */
  approvalCategories: string[];
  createdAt: string;
  updatedAt: string;
}

// User Management → User Access Mapping: per-user, per-Product, per-Category
// System Permissions (a subset of Capability — see CATEGORY_SCOPABLE_CAPABILITIES
// in capabilities.ts; only the rule.* actions are meaningful scoped to a
// category). Deliberately separate from `approvalCategories` above — that's
// Maker-Checker approval authority, this is day-to-day rule visibility/edit
// access. The two are related but not the same permission, same as most
// enterprise BRE/CRM platforms keep them distinct. Reuses Product Master
// (productId) and Rule Categories (categoryId) directly; no duplicate
// product/category entity.
export interface UserProductAccess {
  id: string;
  userId: string;
  productId: string;
  categoryId: string;
  capabilities: Capability[];
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  status: "Active" | "Inactive";
}

// Per-role dashboard defaults (BRD §5.3 Persona-to-Module Mapping) — where a
// role lands after login/switch, and which dashboard widgets it starts with.
// Admin-configured via Configuration Studio → Dashboard Management; a user's
// own in-session drag/show-hide tweaks (the store's `widgets` array) start
// from this but are edited independently — see `resetWidgets`.
export interface DashboardWidgetConfig {
  id: string;
  visible: boolean;
  order: number;
}

export interface DashboardConfig {
  userId: string;
  landingRoute: string;
  widgets: DashboardWidgetConfig[];
  /** KPI card ids (see KPI_REGISTRY) shown at the top of the dashboard. Falls back to a default set when absent/empty. */
  kpis?: string[];
  /** Quick Action ids (see ACTION_REGISTRY) shown in the Quick Actions widget. Falls back to a default set when absent/empty. */
  quickActions?: string[];
}

// Generic per-user, per-device dashboard customization — layered on top of
// DashboardConfig above (which is the admin-set default per role). A page
// declares its own catalog of WidgetDef entries; useDashboardLayout resolves
// that catalog against whatever's persisted for its dashboardKey, so the
// same DashboardControls UI drops onto any dashboard-style page unmodified.
export type WidgetSize = "SM" | "MD" | "LG";

export interface WidgetDef {
  id: string;
  label: string;
  defaultSize: WidgetSize;
  defaultOrder: number;
}

export interface DashboardWidgetLayoutState {
  id: string;
  order: number;
  size: WidgetSize;
  hidden: boolean;
}

// Appearance / personalization schema — every tenant/user can fully restyle
// the shell (theme, accent colors, background, density) without any code
// change. Applied as CSS custom properties on <html> by applyAppearance().
export type ThemePreset =
  | "client"
  | "enterprise-blue"
  | "navy-professional"
  | "modern-purple"
  | "emerald-green"
  | "minimal-gray"
  | "soft-coaching"
  | "warm-orange"
  | "rose-gold"
  | "glass-enterprise";

export type ColorMode = "light" | "dark" | "system";
export type DensityMode = "compact" | "comfortable" | "spacious";
export type FontScale = "sm" | "md" | "lg";
export type BackgroundTarget = "app" | "dashboard" | "sidebar";
export type BackgroundDisplayMode = "cover" | "contain" | "fixed" | "blur";

export interface CustomColors {
  primary?: string; // hex — drives --primary/--ring and primary buttons
  sidebarBg?: string;
  sidebarFg?: string;
  sidebarActive?: string;
  chartAccent?: string; // drives --chart-1
}

export interface BackgroundPrefs {
  imageData: string | null; // data URI
  target: BackgroundTarget;
  displayMode: BackgroundDisplayMode;
  opacity: number; // 0-100
  blur: number; // px
  brightness: number; // %
  dimOverlay: number; // 0-100
}

export interface AppearanceSettings {
  preset: ThemePreset;
  colorMode: ColorMode;
  customColors: CustomColors;
  background: BackgroundPrefs;
  density: DensityMode;
  fontScale: FontScale;
  highContrast: boolean;
  largeClickTargets: boolean;
  showInsights: boolean;
  logo: string | null; // data URI, overrides default brand mark
  /** Org/product name shown in the sidebar lockup, login screen, and browser tab. Admin-only (Appearance Studio's Branding tab). */
  appName: string;
  /** Short tagline shown under appName in the sidebar lockup and login screen. Admin-only. */
  tagline: string;
  /** Display language code (e.g. "en", "hi") — sets <html lang> AND drives
   *  src/lib/i18n.ts's translate()/useTranslate() for the surfaces that have
   *  been wired up (Sidebar nav, Header, Dashboard, Appearance Studio).
   *  Other pages still fall back to English until they're wired too — see
   *  TRANSLATIONS in src/lib/i18n.ts to extend coverage. */
  language: string;
}

export interface CurrentUser {
  /** References an AppUser.id — the signed-in person, from which access
   *  (adminScope + UserProductAccess rows) is resolved. */
  userId: string;
  name: string;
  /** The signed-in user's Job Title label (display only). */
  role: string;
  initials: string;
}

export type ApprovalStage = "Pending Review" | "Approved" | "Rejected";

// Lightweight governance record implementing BRD §5.5's Draft -> Testing ->
// Review -> Publish workflow. One rule can accumulate a history of these as
// it cycles through review rounds.
export type ApprovalRequestType = "publish" | "delete";

export interface ApprovalRequest {
  id: string;
  ruleId: string;
  stage: ApprovalStage;
  requestType?: ApprovalRequestType;
  requestedBy: string;
  requestedAt: string;
  decidedBy?: string;
  decidedAt?: string;
  comment?: string;
}

export interface CategoryInfo {
  name: string;
  domain: Domain | "Cross-Domain";
  ruleCount: number;
}
