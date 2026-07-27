import {
  AppUser,
  ApprovalRequest,
  AuditEntry,
  BusinessRule,
  Condition,
  ConditionGroup,
  DecisionMatrix,
  Domain,
  JsonMapping,
  NotifyCategory,
  NotifyExecutionLog,
  NotifyTrigger,
  NotifyWorkflow,
  NotifyWorkflowTemplate,
  Priority,
  Product,
  ProductRuleMapping,
  Role,
  RuleGroup,
  RuleStatus,
  RuleTemplate,
  SimulationResult,
} from "./types";
import { DEFAULT_RULE_CATEGORIES, DEFAULT_OWNERS } from "./fields";
import { buildHashChain } from "./audit-chain";
import rolesData from "@/data/roles.json";

// ---------- deterministic seeded RNG (avoids SSR/CSR hydration drift) ----------
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(87246);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

let condCounter = 0;
let ruleCounter = 400;
const cid = () => `C-${(++condCounter).toString().padStart(4, "0")}`;

function cond(field: string, operator: Condition["operator"], value: string, value2?: string): Condition {
  return { id: cid(), type: "condition", field, operator, value, value2 };
}

function group(logic: "AND" | "OR", children: (Condition | ConditionGroup)[]): ConditionGroup {
  return { id: cid(), type: "group", logic, children };
}

const now = new Date("2026-07-08T09:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

function makeRule(partial: {
  id: string;
  name: string;
  domain: Domain;
  category: string;
  subCategory?: string;
  priority: Priority;
  status: RuleStatus;
  description: string;
  owner: string;
  rootGroup: ConditionGroup;
  actions: BusinessRule["actions"];
  elseActions?: BusinessRule["elseActions"];
  createdDaysAgo: number;
  updatedDaysAgo: number;
  simulatable?: boolean;
  groupId?: string;
  ruleType?: BusinessRule["ruleType"];
  caseWhens?: BusinessRule["caseWhens"];
  caseElseActions?: BusinessRule["caseElseActions"];
}): BusinessRule {
  return {
    id: partial.id,
    name: partial.name,
    domain: partial.domain,
    category: partial.category,
    subCategory: partial.subCategory,
    groupId: partial.groupId,
    ruleType: partial.ruleType,
    priority: partial.priority,
    status: partial.status,
    description: partial.description,
    owner: partial.owner,
    rootGroup: partial.rootGroup,
    actions: partial.actions,
    elseActions: partial.elseActions,
    caseWhens: partial.caseWhens,
    caseElseActions: partial.caseElseActions,
    simulatable: partial.simulatable ?? true,
    createdAt: daysAgo(partial.createdDaysAgo),
    updatedAt: daysAgo(partial.updatedDaysAgo),
    version: 1,
  };
}

// ============================================================
// CORE, FULLY-WIRED RULES — these drive the live simulator demo
// ============================================================
export const CORE_RULES: BusinessRule[] = [
  // ---------------- LENDING ----------------
  makeRule({
    id: "RL-101",
    name: "Minimum Credit Score Validation",
    domain: "Lending",
    category: "Eligibility",
    subCategory: "Bureau Checks",
    priority: 1,
    status: "Active",
    description: "Rejects applicants whose bureau credit score falls below the configured minimum threshold.",
    owner: "Credit Risk Division",
    rootGroup: group("AND", [cond("credit_score", "<", "650")]),
    actions: [
      { id: cid(), type: "Reject", reasonCode: "LOW_CREDIT_SCORE", message: "Credit score below minimum threshold of 650." },
    ],
    createdDaysAgo: 120,
    updatedDaysAgo: 2,
  }),
  makeRule({
    id: "RL-103",
    name: "Minimum Age Validation",
    domain: "Lending",
    category: "Eligibility",
    priority: 1,
    status: "Active",
    description: "Ensures the applicant meets the minimum legal age requirement for loan origination.",
    owner: "Credit Risk Division",
    rootGroup: group("AND", [cond("applicant_age", "<", "21")]),
    actions: [
      { id: cid(), type: "Reject", reasonCode: "AGE_INELIGIBLE", message: "Applicant does not meet minimum age requirement of 21." },
    ],
    createdDaysAgo: 118,
    updatedDaysAgo: 40,
  }),
  makeRule({
    id: "RL-118",
    name: "Young Adult Fast-Track Approval",
    domain: "Lending",
    category: "Eligibility",
    priority: 2,
    status: "Active",
    description: "Fast-track approval scheme for young adult loan applicants.",
    owner: "Product Strategy Team",
    rootGroup: group("AND", [cond("applicant_age", "<", "25")]),
    actions: [
      { id: cid(), type: "Approve", reasonCode: "YOUNG_ADULT_FASTTRACK", message: "Fast-track loan approval for young adult applicants." },
    ],
    createdDaysAgo: 90,
    updatedDaysAgo: 10,
  }),
  makeRule({
    id: "RL-104",
    name: "Debt-to-Income Ratio Cap",
    domain: "Lending",
    category: "Risk & Fraud",
    priority: 2,
    status: "Active",
    description: "Flags applicants whose fixed obligations exceed a safe proportion of monthly income.",
    owner: "Credit Risk Division",
    rootGroup: group("AND", [cond("dti_ratio", ">=", "50")]),
    actions: [
      { id: cid(), type: "Reject", reasonCode: "HIGH_DTI", message: "Debt-to-income ratio of 50% or higher exceeds policy limit." },
    ],
    createdDaysAgo: 110,
    updatedDaysAgo: 15,
  }),
  makeRule({
    id: "RL-105",
    name: "Self-Employed High-Ticket Review",
    domain: "Lending",
    category: "Underwriting",
    priority: 3,
    status: "Active",
    description: "Routes high-value loan requests from self-employed applicants to manual underwriting review.",
    owner: "Product Strategy Team",
    rootGroup: group("AND", [
      cond("employment_type", "=", "Self-Employed"),
      cond("loan_amount", ">", "2000000"),
    ]),
    actions: [
      { id: cid(), type: "Flag for Review", reasonCode: "REVIEW_ADDITIONAL_DOCS", message: "Review required: self-employed applicant requesting high-value loan." },
    ],
    createdDaysAgo: 95,
    updatedDaysAgo: 8,
  }),
  makeRule({
    id: "RL-107",
    name: "High Loan Amount Manager Review",
    domain: "Lending",
    category: "Risk & Fraud",
    priority: 2,
    status: "Active",
    description: "Escalates very large loan requests for senior manager sign-off before approval.",
    owner: "Credit Risk Division",
    rootGroup: group("AND", [cond("loan_amount", ">", "5000000")]),
    actions: [
      { id: cid(), type: "Flag for Review", reasonCode: "HIGH_VALUE_REVIEW", message: "Review required: loan amount exceeds ₹50,00,000 auto-approval ceiling." },
    ],
    createdDaysAgo: 80,
    updatedDaysAgo: 30,
  }),
  makeRule({
    id: "RL-106",
    name: "Standard Lending Approval",
    domain: "Lending",
    category: "Eligibility",
    priority: 5,
    status: "Active",
    description: "Baseline approval action applied once all higher-priority eligibility and risk checks pass.",
    owner: "Product Strategy Team",
    rootGroup: group("AND", []),
    actions: [
      { id: cid(), type: "Approve", reasonCode: "ELIGIBLE_CUSTOMER", message: "Applicant meets all eligibility and underwriting criteria." },
    ],
    createdDaysAgo: 120,
    updatedDaysAgo: 60,
  }),
  makeRule({
    id: "RL-108",
    name: "Non-Metro KYC Compliance Check",
    domain: "Lending",
    category: "Compliance",
    priority: 4,
    status: "Draft",
    description: "Draft rule under review: flags applicants outside standard metro coverage for extended KYC.",
    owner: "Compliance Office",
    rootGroup: group("AND", [cond("city", "=", "Other")]),
    actions: [{ id: cid(), type: "Show Message", reasonCode: "KYC_LOCATION_REVIEW", message: "Extended KYC required for non-metro applicants." }],
    createdDaysAgo: 6,
    updatedDaysAgo: 1,
  }),
  makeRule({
    id: "RL-109",
    name: "Premium Segment Fast-Track",
    domain: "Lending",
    category: "Eligibility",
    priority: 3,
    status: "Inactive",
    description: "Disabled pilot rule that fast-tracked premium-segment applicants; paused pending policy review.",
    owner: "Product Strategy Team",
    rootGroup: group("AND", [cond("segment", "=", "Premium")]),
    actions: [{ id: cid(), type: "Show Message", reasonCode: "FAST_TRACK", message: "Premium segment fast-track applied." }],
    createdDaysAgo: 60,
    updatedDaysAgo: 45,
  }),
  makeRule({
    id: "RL-111",
    name: "High-Risk Profile Escalation",
    domain: "Lending",
    category: "Underwriting",
    priority: 2,
    status: "Active",
    description:
      "Nested group demo (OR of two ANDs): escalates a case if either a marginal-credit self-employed applicant, or a large loan paired with a high DTI, is detected.",
    owner: "Credit Risk Division",
    rootGroup: group("OR", [
      group("AND", [cond("credit_score", "<", "700"), cond("employment_type", "=", "Self-Employed")]),
      group("AND", [cond("loan_amount", ">", "3000000"), cond("dti_ratio", ">", "40")]),
    ]),
    actions: [
      { id: cid(), type: "Show Message", reasonCode: "COMPOSITE_RISK_REVIEW", message: "Composite risk profile detected — route to senior underwriter." },
    ],
    createdDaysAgo: 10,
    updatedDaysAgo: 3,
    groupId: "grp-risk-review",
  }),
  makeRule({
    id: "RL-110",
    name: "Home Loan Eligibility – Standard Approval",
    domain: "Lending",
    category: "Eligibility",
    priority: 3,
    status: "Active",
    description: "Automatically evaluate a home loan application based on customer eligibility criteria and approve eligible applications while routing ineligible applications for manual review.",
    owner: "Product Strategy Team",
    rootGroup: group("AND", [
      cond("loan_amount", "<=", "500000"),
      group("OR", [
        cond("employment_type", "=", "Salaried"),
        cond("employment_type", "=", "Government"),
      ]),
      group("OR", [
        cond("credit_score", ">=", "750"),
        cond("monthly_income", ">=", "60000"),
      ]),
      cond("applicant_age", "between", "21", "58"),
      cond("monthly_liabilities", "<=", "15000"),
      cond("city", "in", "Mumbai, Pune, Ahmedabad"),
    ]),
    actions: [
      { id: cid(), type: "Approve", reasonCode: "ELIGIBLE_CUSTOMER", message: "Approve the Home Loan application." },
      { id: cid(), type: "Assign Value", outputField: "interest_rate", outputValue: "8.25", outputType: "number" },
      { id: cid(), type: "Assign Value", outputField: "processing_fee", outputValue: "0.50", outputType: "number" },
      { id: cid(), type: "Assign Value", outputField: "loan_type", outputValue: "Priority Customer", outputType: "string" },
      { id: cid(), type: "Assign Value", outputField: "assigned_to", outputValue: "Branch Manager", outputType: "string" },
      { id: cid(), type: "Show Message", message: "Send Approval SMS" },
      { id: cid(), type: "Show Message", message: "Send Approval Email" },
      { id: cid(), type: "Show Message", message: "Generate Eligibility Certificate" },
      { id: cid(), type: "Show Message", message: "Create Audit Log Entry" },
      { id: cid(), type: "Show Message", message: "Display Success Message" },
    ],
    elseActions: [
      { id: cid(), type: "Flag for Review", reasonCode: "MANUAL_REVIEW", message: "Mark the application for Manual Review." },
      { id: cid(), type: "Assign Value", outputField: "assigned_to", outputValue: "Credit Officer", outputType: "string" },
      { id: cid(), type: "Show Message", message: "Display Failure Reason" },
      { id: cid(), type: "Show Message", message: "Generate Audit Log Entry" },
      { id: cid(), type: "Show Message", message: "Notify Relationship Manager" },
    ],
    createdDaysAgo: 5,
    updatedDaysAgo: 1,
  }),
  makeRule({
    id: "RL-112",
    name: "Auto Loan High DTI Validation",
    domain: "Lending",
    category: "Risk & Fraud",
    priority: 2,
    status: "Active",
    description: "Flags or rejects auto loan requests where debt-to-income ratio exceeds safe thresholds for self-employed/business owners.",
    owner: "Credit Risk Division",
    rootGroup: group("AND", [
      cond("dti_ratio", ">", "45"),
      cond("employment_type", "=", "Business Owner"),
    ]),
    actions: [
      { id: cid(), type: "Flag for Review", reasonCode: "HIGH_DTI_BUSINESS_OWNER", message: "Manual review required: DTI ratio of 45% or higher for Business Owner applicant." },
    ],
    createdDaysAgo: 8,
    updatedDaysAgo: 2,
  }),
  makeRule({
    id: "RL-113",
    name: "Composite Personal Loan Risk Gate",
    domain: "Lending",
    category: "Risk & Fraud",
    priority: 2,
    status: "Active",
    description: "Applies additional check for personal loans, flagging applicants who have low credit score OR low monthly income.",
    owner: "Credit Risk Division",
    rootGroup: group("AND", [
      cond("loan_type", "=", "Personal Loan"),
      group("OR", [
        cond("credit_score", "<", "600"),
        cond("monthly_income", "<", "25000"),
      ]),
    ]),
    actions: [
      { id: cid(), type: "Flag for Review", reasonCode: "PERSONAL_LOAN_RISK", message: "Personal loan request flagged: applicant exhibits marginal credit or income profile." },
    ],
    createdDaysAgo: 3,
    updatedDaysAgo: 1,
  }),

  // ---- Home Loan — Demo: 4 chained rule types (IF/WHERE/CASE/GROUP) ----
  makeRule({
    id: "RL-114",
    name: "Applicant Eligibility",
    domain: "Lending",
    category: "Eligibility",
    priority: 1,
    status: "Active",
    ruleType: "IF",
    description: "Gates the Home Loan chain: applicant must be 21+ and salaried before any downstream check runs.",
    owner: "Credit Risk Division",
    rootGroup: group("AND", [
      cond("applicant_age", ">=", "21"),
      cond("employment_type", "=", "Salaried"),
    ]),
    actions: [{ id: cid(), type: "Assign Value", outputField: "applicant_eligible", outputValue: "true", outputType: "boolean" }],
    elseActions: [{ id: cid(), type: "Assign Value", outputField: "applicant_eligible", outputValue: "false", outputType: "boolean" }],
    createdDaysAgo: 5,
    updatedDaysAgo: 1,
  }),
  makeRule({
    id: "RL-115",
    name: "Income Validation",
    domain: "Lending",
    category: "Eligibility",
    priority: 2,
    status: "Active",
    ruleType: "WHERE",
    description: "Only meaningfully passes once Applicant Eligibility has chained applicant_eligible=true — an AND-gate against that output plus the income floor.",
    owner: "Credit Risk Division",
    rootGroup: group("AND", [
      cond("applicant_eligible", "=", "true"),
      cond("monthly_income", ">=", "50000"),
    ]),
    actions: [{ id: cid(), type: "Assign Value", outputField: "income_eligible", outputValue: "true", outputType: "boolean" }],
    elseActions: [{ id: cid(), type: "Assign Value", outputField: "income_eligible", outputValue: "false", outputType: "boolean" }],
    createdDaysAgo: 5,
    updatedDaysAgo: 1,
  }),
  makeRule({
    id: "RL-116",
    name: "Interest Rate Determination",
    domain: "Lending",
    category: "Pricing",
    priority: 3,
    status: "Active",
    ruleType: "CASE",
    description: "Native CASE rule: brackets credit score into interest rate tiers (>=800 -> 8.25%, 750-799 -> 8.75%, 700-749 -> 9.50%); rejects below 700.",
    owner: "Credit Risk Division",
    // CASE mode is the complete rule here — rootGroup/actions stay empty
    // since the Condition Builder / THEN Action Builder are hidden whenever
    // caseWhens is populated (see src/app/rule-builder/page.tsx).
    rootGroup: group("AND", []),
    actions: [],
    caseWhens: [
      { id: cid(), field: "credit_score", operator: ">=", value: "800", outputField: "interest_rate", outputValue: "8.25" },
      { id: cid(), field: "credit_score", operator: "between", value: "750", value2: "799", outputField: "interest_rate", outputValue: "8.75" },
      { id: cid(), field: "credit_score", operator: "between", value: "700", value2: "749", outputField: "interest_rate", outputValue: "9.50" },
    ],
    caseElseActions: [
      { id: cid(), type: "Reject", reasonCode: "LOW_CREDIT_SCORE", message: "Credit score below 700 minimum for Home Loan pricing." },
    ],
    createdDaysAgo: 5,
    updatedDaysAgo: 1,
  }),
  makeRule({
    id: "RL-117",
    name: "Final Loan Decision",
    domain: "Lending",
    category: "Eligibility",
    priority: 4,
    status: "Active",
    ruleType: "GROUP",
    description: "Composite gate: both eligibility flags true AND (strong credit score OR high property value).",
    owner: "Credit Risk Division",
    rootGroup: group("AND", [
      group("AND", [
        cond("applicant_eligible", "=", "true"),
        cond("income_eligible", "=", "true"),
      ]),
      { ...group("OR", [
          cond("credit_score", ">=", "750"),
          cond("property_value", ">=", "7000000"),
        ]), connector: "AND" },
    ]),
    actions: [
      { id: cid(), type: "Approve", reasonCode: "ELIGIBLE_CUSTOMER", message: "Applicant and income eligible with strong credit/collateral profile." },
      { id: cid(), type: "Assign Value", outputField: "loan_decision", outputValue: "APPROVED", outputType: "string" },
      { id: cid(), type: "Calculate", outputField: "approved_amount", outputValue: "{{loan_amount}}", outputType: "number" },
    ],
    elseActions: [
      { id: cid(), type: "Reject", reasonCode: "POLICY_BREACH", message: "Eligibility or credit/collateral thresholds not met." },
      { id: cid(), type: "Assign Value", outputField: "loan_decision", outputValue: "REJECTED", outputType: "string" },
    ],
    createdDaysAgo: 5,
    updatedDaysAgo: 1,
  }),

  // ---------------- INSURANCE ----------------
  makeRule({
    id: "RL-202",
    name: "Minimum Age for Coverage",
    domain: "Insurance",
    category: "Eligibility",
    priority: 1,
    status: "Active",
    description: "Rejects proposals from applicants below the minimum insurable age.",
    owner: "Actuarial Underwriting",
    rootGroup: group("AND", [cond("applicant_age", "<", "18")]),
    actions: [{ id: cid(), type: "Reject", reasonCode: "UNDERAGE_APPLICANT", message: "Applicant is below the minimum insurable age of 18." }],
    createdDaysAgo: 130, updatedDaysAgo: 20,
  }),
  makeRule({
    id: "RL-203",
    name: "Senior Applicant Underwriting Referral",
    domain: "Insurance",
    category: "Underwriting",
    priority: 2,
    status: "Active",
    description: "Refers applicants above standard age bands for senior medical underwriting review.",
    owner: "Actuarial Underwriting",
    rootGroup: group("AND", [cond("applicant_age", ">", "65")]),
    actions: [{ id: cid(), type: "Flag for Review", reasonCode: "SENIOR_UNDERWRITING_REQUIRED", message: "Manual senior underwriting review required for applicants above 65." }],
    createdDaysAgo: 100, updatedDaysAgo: 12,
  }),
  makeRule({
    id: "RL-204",
    name: "High BMI Medical Referral",
    domain: "Insurance",
    category: "Underwriting",
    priority: 2,
    status: "Active",
    description: "Flags applicants with elevated BMI for a supplementary medical assessment.",
    owner: "Actuarial Underwriting",
    rootGroup: group("AND", [cond("bmi", ">", "35")]),
    actions: [{ id: cid(), type: "Show Message", reasonCode: "MEDICAL_REFERRAL_REQUIRED", message: "BMI above 35 requires supplementary medical assessment." }],
    createdDaysAgo: 90, updatedDaysAgo: 25,
  }),
  makeRule({
    id: "RL-205",
    name: "Dual Risk Factor Referral",
    domain: "Insurance",
    category: "Risk & Fraud",
    priority: 2,
    status: "Active",
    description: "Escalates applicants combining adverse medical history with high-risk occupation.",
    owner: "Actuarial Underwriting",
    rootGroup: group("AND", [
      cond("medical_history", "=", "true"),
      cond("occupation_type", "=", "High Risk"),
    ]),
    actions: [{ id: cid(), type: "Show Message", reasonCode: "DUAL_RISK_REFERRAL", message: "Combined medical history and high-risk occupation requires referral." }],
    createdDaysAgo: 75, updatedDaysAgo: 5,
  }),
  makeRule({
    id: "RL-206",
    name: "High Sum Assured Verification",
    domain: "Insurance",
    category: "Compliance",
    priority: 3,
    status: "Active",
    description: "Requires additional financial verification for very large sum assured requests.",
    owner: "Compliance Office",
    rootGroup: group("AND", [cond("sum_assured", ">", "5000000")]),
    actions: [{ id: cid(), type: "Show Message", reasonCode: "HIGH_SUM_ASSURED_CHECK", message: "Sum assured above ₹50,00,000 requires financial verification." }],
    createdDaysAgo: 70, updatedDaysAgo: 33,
  }),
  makeRule({
    id: "RL-201",
    name: "Smoker Risk Classification",
    domain: "Insurance",
    category: "Pricing",
    priority: 4,
    status: "Active",
    description: "Tags smoker declarations so premium loading is applied from the Insurance Premium Rate Slabs matrix.",
    owner: "Actuarial Underwriting",
    rootGroup: group("AND", [cond("smoker", "=", "true")]),
    actions: [{ id: cid(), type: "Assign Value", outputField: "risk_classification", outputValue: "Loaded", reasonCode: "SMOKER_LOADING" }],
    createdDaysAgo: 140, updatedDaysAgo: 3,
  }),
  makeRule({
    id: "RL-207",
    name: "Standard Policy Approval",
    domain: "Insurance",
    category: "Eligibility",
    priority: 5,
    status: "Active",
    description: "Baseline approval action applied once all higher-priority underwriting checks pass.",
    owner: "Actuarial Underwriting",
    rootGroup: group("AND", []),
    actions: [{ id: cid(), type: "Approve", reasonCode: "ELIGIBLE_CUSTOMER", message: "Applicant meets all underwriting criteria for standard policy issuance." }],
    createdDaysAgo: 140, updatedDaysAgo: 60,
  }),
  makeRule({
    id: "RL-208",
    name: "Hazardous Occupation Exclusion",
    domain: "Insurance",
    category: "Compliance",
    priority: 1,
    status: "Draft",
    description: "Draft rule under actuarial review: would exclude combined smoker + high-risk-occupation proposals.",
    owner: "Compliance Office",
    rootGroup: group("AND", [
      cond("occupation_type", "=", "High Risk"),
      cond("smoker", "=", "true"),
    ]),
    actions: [{ id: cid(), type: "Reject", reasonCode: "HAZARDOUS_EXCLUSION", message: "Combined smoker and high-risk occupation profile excluded under draft policy." }],
    createdDaysAgo: 4, updatedDaysAgo: 1,
  }),
  makeRule({
    id: "RL-210",
    name: "Composite Underwriting Risk Gate",
    domain: "Insurance",
    category: "Risk & Fraud",
    priority: 2,
    status: "Active",
    description:
      "Nested group demo (OR of two ANDs): flags a proposal if either an overweight smoker, or a high-risk occupation combined with a large sum assured, is detected.",
    owner: "Actuarial Underwriting",
    rootGroup: group("OR", [
      group("AND", [cond("smoker", "=", "true"), cond("bmi", ">", "30")]),
      group("AND", [cond("occupation_type", "=", "High Risk"), cond("sum_assured", ">", "3000000")]),
    ]),
    actions: [
      { id: cid(), type: "Flag for Review", reasonCode: "COMPOSITE_UNDERWRITING_RISK", message: "Composite underwriting risk detected — route for manual review." },
    ],
    createdDaysAgo: 7, updatedDaysAgo: 1,
    groupId: "grp-risk-review",
  }),
  makeRule({
    id: "RL-209",
    name: "Insurance High Risk Occupation Check",
    domain: "Insurance",
    category: "Underwriting",
    priority: 2,
    status: "Active",
    description: "Refers term life applications to actuarial review if applicant smokes and is in a high-risk occupation.",
    owner: "Actuarial Underwriting",
    rootGroup: group("AND", [
      cond("smoker", "=", "true"),
      cond("occupation_type", "=", "High Risk"),
    ]),
    actions: [
      { id: cid(), type: "Flag for Review", reasonCode: "HIGH_OCCUPATION_RISK", message: "Actuarial health underwriting referral required for high-risk smokers." },
    ],
    createdDaysAgo: 12,
    updatedDaysAgo: 3,
  }),

  // ---------------- NBFC / GOLD LOAN ----------------
  makeRule({
    id: "RL-301",
    name: "Unsupported Collateral Exclusion",
    domain: "NBFC",
    category: "Collateral",
    priority: 1,
    status: "Active",
    description: "Rejects collateral types that are not currently supported for secured lending.",
    owner: "Asset Management Group",
    rootGroup: group("AND", [cond("collateral_type", "=", "Securities")]),
    actions: [{ id: cid(), type: "Reject", reasonCode: "UNSUPPORTED_COLLATERAL", message: "Securities are not accepted as collateral under current policy." }],
    createdDaysAgo: 115, updatedDaysAgo: 50,
  }),
  makeRule({
    id: "RL-302",
    name: "Minimum Appraised Value Threshold",
    domain: "NBFC",
    category: "Collateral",
    priority: 2,
    status: "Active",
    description: "Rejects collateral appraised below the minimum lendable value.",
    owner: "Asset Management Group",
    rootGroup: group("AND", [cond("appraised_value", "<", "50000")]),
    actions: [{ id: cid(), type: "Reject", reasonCode: "BELOW_MIN_VALUATION", message: "Appraised asset value is below the minimum lendable threshold of ₹50,000." }],
    createdDaysAgo: 105, updatedDaysAgo: 18,
  }),
  makeRule({
    id: "RL-303",
    name: "Gold Purity Grade Check",
    domain: "NBFC",
    category: "Compliance",
    priority: 2,
    status: "Active",
    description: "Rejects gold collateral that does not meet the minimum purity grade for valuation.",
    owner: "Asset Management Group",
    rootGroup: group("AND", [
      cond("collateral_type", "=", "Gold"),
      cond("purity_grade", "<", "75"),
    ]),
    actions: [{ id: cid(), type: "Reject", reasonCode: "SUBSTANDARD_PURITY", message: "Gold purity below 75% does not meet policy standard." }],
    createdDaysAgo: 98, updatedDaysAgo: 9,
  }),
  makeRule({
    id: "RL-309",
    name: "Gold Collateral Preferential Approval",
    domain: "NBFC",
    category: "Collateral",
    priority: 2,
    status: "Active",
    description: "Automated approval for gold-backed loan requests under current promotional scheme.",
    owner: "Asset Management Group",
    rootGroup: group("AND", [cond("collateral_type", "=", "Gold")]),
    actions: [{ id: cid(), type: "Approve", reasonCode: "GOLD_PREFERRED_APPROVAL", message: "Gold collateral meets eligibility criteria for auto-approval." }],
    createdDaysAgo: 85, updatedDaysAgo: 12,
  }),
  makeRule({
    id: "RL-304",
    name: "LTV Ceiling Guardrail",
    domain: "NBFC",
    category: "Risk & Fraud",
    priority: 2,
    status: "Active",
    description: "Flags loan-to-value requests that exceed the maximum permitted ceiling for manual review.",
    owner: "Credit Risk Division",
    rootGroup: group("AND", [cond("ltv_requested", ">", "75")]),
    actions: [{ id: cid(), type: "Flag for Review", reasonCode: "LTV_EXCEEDS_CEILING", message: "Requested LTV exceeds the 75% policy ceiling; review required." }],
    createdDaysAgo: 88, updatedDaysAgo: 22,
  }),
  makeRule({
    id: "RL-305",
    name: "High-Value Asset Manager Sign-off",
    domain: "NBFC",
    category: "Underwriting",
    priority: 3,
    status: "Active",
    description: "Escalates high-value collateral for manager sign-off before disbursement.",
    owner: "Asset Management Group",
    rootGroup: group("AND", [cond("appraised_value", ">", "1000000")]),
    actions: [{ id: cid(), type: "Show Message", reasonCode: "HIGH_VALUE_ASSET_SIGNOFF", message: "Asset value above ₹10,00,000 requires manager sign-off." }],
    createdDaysAgo: 82, updatedDaysAgo: 40,
  }),
  makeRule({
    id: "RL-306",
    name: "Standard Collateral Approval",
    domain: "NBFC",
    category: "Eligibility",
    priority: 5,
    status: "Active",
    description: "Baseline approval action applied once all higher-priority collateral checks pass.",
    owner: "Asset Management Group",
    rootGroup: group("AND", []),
    actions: [{ id: cid(), type: "Approve", reasonCode: "ELIGIBLE_CUSTOMER", message: "Collateral meets all eligibility criteria for secured financing." }],
    createdDaysAgo: 115, updatedDaysAgo: 65,
  }),
  makeRule({
    id: "RL-307",
    name: "Used Vehicle Age Restriction",
    domain: "NBFC",
    category: "Compliance",
    priority: 2,
    status: "Inactive",
    description: "Paused rule that previously restricted financing on vehicles beyond a certain registration age.",
    owner: "Asset Management Group",
    rootGroup: group("AND", [cond("collateral_type", "=", "Vehicle")]),
    actions: [{ id: cid(), type: "Show Message", reasonCode: "VEHICLE_AGE_CHECK", message: "Vehicle registration age verification required." }],
    createdDaysAgo: 55, updatedDaysAgo: 48,
  }),
  makeRule({
    id: "RL-310",
    name: "Bulk High-Value Pledge Escalation",
    domain: "NBFC",
    category: "Risk & Fraud",
    priority: 2,
    status: "Active",
    description:
      "Nested group demo (OR of two ANDs): escalates a pledge if either high-value gold collateral or a high-LTV property pledge is detected.",
    owner: "Credit Risk Division",
    rootGroup: group("OR", [
      group("AND", [cond("collateral_type", "=", "Gold"), cond("appraised_value", ">", "800000")]),
      group("AND", [cond("collateral_type", "=", "Property"), cond("ltv_requested", ">", "60")]),
    ]),
    actions: [{ id: cid(), type: "Show Message", reasonCode: "BULK_PLEDGE_ESCALATION", message: "High-value pledge profile detected — route for manager escalation." }],
    createdDaysAgo: 5, updatedDaysAgo: 1,
    groupId: "grp-risk-review",
  }),
  makeRule({
    id: "RL-308",
    name: "Gold Loan High LTV Review",
    domain: "NBFC",
    category: "Collateral",
    priority: 2,
    status: "Active",
    description: "Requires manager sign-off if the requested Loan-to-Value (LTV) exceeds 80% while gold purity is below 90%.",
    owner: "Asset Management Group",
    rootGroup: group("AND", [
      cond("ltv_requested", ">", "80"),
      cond("purity_grade", "<", "90"),
    ]),
    actions: [
      { id: cid(), type: "Flag for Review", reasonCode: "HIGH_LTV_MARGINAL_PURITY", message: "Manager approval required for LTV > 80% with gold purity under 90%." },
    ],
    createdDaysAgo: 14,
    updatedDaysAgo: 4,
  }),

  // ---------------- CREDIT CARDS ----------------
  // Mirrors the Home Loan rule shape (reject x2 + manager-review + baseline
  // approval) so a newly-configured domain has the same demonstrable
  // positive/negative outcomes as the established ones.
  makeRule({
    id: "RL-601",
    name: "Minimum Income Eligibility",
    domain: "CreditCards",
    category: "Eligibility",
    priority: 1,
    status: "Active",
    description: "Declines card applications below the minimum annual income threshold.",
    owner: "Credit Risk Division",
    rootGroup: group("AND", [cond("annual_income", "<", "300000")]),
    actions: [{ id: cid(), type: "Reject", reasonCode: "INSUFFICIENT_INCOME", message: "Annual income is below the minimum required for card issuance." }],
    createdDaysAgo: 40, updatedDaysAgo: 12,
  }),
  makeRule({
    id: "RL-602",
    name: "Excessive Credit Utilization Exclusion",
    domain: "CreditCards",
    category: "Risk & Fraud",
    priority: 2,
    status: "Active",
    description: "Declines applicants whose existing credit utilization ratio is already excessive.",
    owner: "Credit Risk Division",
    rootGroup: group("AND", [cond("credit_utilization_ratio", ">", "90")]),
    actions: [{ id: cid(), type: "Reject", reasonCode: "UTILIZATION_EXCEEDED", message: "Existing credit utilization ratio exceeds the acceptable limit." }],
    createdDaysAgo: 35, updatedDaysAgo: 10,
  }),
  makeRule({
    id: "RL-603",
    name: "High Limit Request Manager Review",
    domain: "CreditCards",
    category: "Risk & Fraud",
    priority: 3,
    status: "Active",
    description: "Routes unusually high credit limit requests to a manager before approval.",
    owner: "Credit Risk Division",
    rootGroup: group("AND", [cond("requested_credit_limit", ">", "500000")]),
    actions: [{ id: cid(), type: "Flag for Review", reasonCode: "HIGH_LIMIT_REVIEW", message: "High credit limit requested — route to manager for review." }],
    createdDaysAgo: 30, updatedDaysAgo: 8,
  }),
  makeRule({
    id: "RL-604",
    name: "Standard Card Approval",
    domain: "CreditCards",
    category: "Eligibility",
    priority: 5,
    status: "Active",
    description: "Baseline approval action applied once all higher-priority eligibility and risk checks pass.",
    owner: "Product Strategy Team",
    rootGroup: group("AND", []),
    actions: [{ id: cid(), type: "Approve", reasonCode: "ELIGIBLE_CUSTOMER", message: "Applicant meets all eligibility and risk criteria for card issuance." }],
    createdDaysAgo: 40, updatedDaysAgo: 12,
  }),
  makeRule({
    id: "RL-605",
    name: "Credit Card Platinum Eligibility",
    domain: "CreditCards",
    category: "Eligibility",
    priority: 3,
    status: "Active",
    description: "Determines platinum credit limit tiers based on applicant's annual income and positive utilization patterns.",
    owner: "Product Strategy Team",
    rootGroup: group("AND", [
      cond("annual_income", ">=", "1200000"),
      cond("credit_utilization_ratio", "<", "30"),
    ]),
    actions: [
      { id: cid(), type: "Approve", reasonCode: "PLATINUM_ELIGIBLE", message: "Approved for Premium Platinum Card tier." },
      { id: cid(), type: "Assign Value", outputField: "card_tier", outputValue: "Premium Platinum", outputType: "string" },
    ],
    createdDaysAgo: 15,
    updatedDaysAgo: 5,
  }),

  // ---------------- WEALTH MANAGEMENT ----------------
  makeRule({
    id: "RL-701",
    name: "Minimum Investment Threshold",
    domain: "Wealth",
    category: "Eligibility",
    priority: 1,
    status: "Active",
    description: "Declines onboarding when the proposed investment amount is below the plan's minimum.",
    owner: "Asset Management Group",
    rootGroup: group("AND", [cond("investment_amount", "<", "50000")]),
    actions: [{ id: cid(), type: "Reject", reasonCode: "BELOW_MIN_INVESTMENT", message: "Investment amount is below the minimum required for this plan." }],
    createdDaysAgo: 25, updatedDaysAgo: 9,
  }),
  makeRule({
    id: "RL-702",
    name: "KYC Verification Gate",
    domain: "Wealth",
    category: "Compliance",
    priority: 2,
    status: "Active",
    description: "Declines onboarding until KYC verification is complete.",
    owner: "Compliance Office",
    rootGroup: group("AND", [cond("kyc_verified", "=", "false")]),
    actions: [{ id: cid(), type: "Reject", reasonCode: "KYC_INCOMPLETE", message: "KYC verification must be completed before this account can be opened." }],
    createdDaysAgo: 25, updatedDaysAgo: 9,
  }),
  makeRule({
    id: "RL-703",
    name: "Aggressive Risk Profile Advisory Review",
    domain: "Wealth",
    category: "Risk & Fraud",
    priority: 3,
    status: "Active",
    description: "Routes applicants with an aggressive risk appetite to an advisor before onboarding.",
    owner: "Asset Management Group",
    rootGroup: group("AND", [cond("risk_appetite", "=", "Aggressive")]),
    actions: [{ id: cid(), type: "Flag for Review", reasonCode: "AGGRESSIVE_PROFILE_REVIEW", message: "Aggressive risk appetite — advisor review recommended before onboarding." }],
    createdDaysAgo: 20, updatedDaysAgo: 6,
  }),
  makeRule({
    id: "RL-704",
    name: "Standard Portfolio Approval",
    domain: "Wealth",
    category: "Eligibility",
    priority: 5,
    status: "Active",
    description: "Baseline approval action applied once all higher-priority eligibility and compliance checks pass.",
    owner: "Product Strategy Team",
    rootGroup: group("AND", []),
    actions: [{ id: cid(), type: "Approve", reasonCode: "ELIGIBLE_CUSTOMER", message: "Applicant meets all eligibility and compliance criteria for onboarding." }],
    createdDaysAgo: 25, updatedDaysAgo: 9,
  }),
  makeRule({
    id: "RL-705",
    name: "Wealth Moderate Risk Fitment",
    domain: "Wealth",
    category: "Eligibility",
    priority: 3,
    status: "Active",
    description: "Recommends a hybrid portfolio balance for moderate risk appetite and medium-to-long investment horizons.",
    owner: "Asset Management Group",
    rootGroup: group("AND", [
      cond("risk_appetite", "=", "Moderate"),
      cond("investment_horizon_years", ">=", "5"),
    ]),
    actions: [
      { id: cid(), type: "Approve", reasonCode: "HYBRID_SUITABLE", message: "Onboarding suitable for moderate hybrid growth strategy." },
      { id: cid(), type: "Assign Value", outputField: "suggested_portfolio", outputValue: "Hybrid Balanced Growth", outputType: "string" },
    ],
    createdDaysAgo: 18,
    updatedDaysAgo: 6,
  }),

  // ============================================================
  // ENTERPRISE DEMO RULES (RL-501…RL-508) — production-style banking
  // rules authored for client demonstration: nested AND/OR groups,
  // calculated variables, rule chaining (RL-501 → RL-502), multiple
  // outputs, and approve/reject/review flows. All metadata-driven —
  // every field referenced exists in the Field Catalog; risk_score is
  // a chained Generated Variable produced by RL-501.
  // ============================================================

  // COMPLEX 1 — risk scoring with nested employment logic; feeds RL-502.
  makeRule({
    id: "RL-501",
    name: "Personal Loan Application Risk Grade",
    domain: "Lending",
    category: "Risk & Fraud",
    priority: 1,
    status: "Active",
    description:
      "Grades applicant risk from bureau score and leverage. Salaried/Government profiles qualify directly; self-employed applicants need ₹75,000+ monthly income. Produces risk_score (0–100) for downstream eligibility rules on both branches.",
    owner: "Credit Risk Division",
    rootGroup: group("AND", [
      cond("credit_score", ">=", "650"),
      cond("dti_ratio", "<=", "45"),
      group("OR", [
        cond("employment_type", "=", "Salaried"),
        cond("employment_type", "=", "Government"),
        group("AND", [
          cond("employment_type", "=", "Self-Employed"),
          cond("monthly_income", ">=", "75000"),
        ]),
      ]),
    ]),
    actions: [
      { id: cid(), type: "Calculate", outputField: "risk_score", outputValue: "({{credit_score}} - 300) / 6", outputType: "number" },
      { id: cid(), type: "Assign Value", outputField: "risk_grade", outputValue: "Standard", outputType: "string" },
    ],
    elseActions: [
      { id: cid(), type: "Calculate", outputField: "risk_score", outputValue: "({{credit_score}} - 300) / 6", outputType: "number" },
      { id: cid(), type: "Assign Value", outputField: "risk_grade", outputValue: "High Risk", outputType: "string" },
      { id: cid(), type: "Flag for Review", reasonCode: "RISK_REVIEW", message: "Profile outside standard risk band — manual credit review required." },
    ],
    createdDaysAgo: 6,
    updatedDaysAgo: 1,
  }),

  // COMPLEX 2 — eligibility + limit sizing; CHAINS on RL-501's risk_score.
  makeRule({
    id: "RL-502",
    name: "Personal Loan Eligibility & Limit",
    domain: "Lending",
    category: "Eligibility",
    priority: 1,
    status: "Active",
    description:
      "Approves personal-loan applicants aged 21–58 earning ₹40,000+ with a chained risk_score of 55+ (from Personal Loan Application Risk Grade), and sizes the eligible amount at 60× monthly income with an indicative EMI.",
    owner: "Credit Risk Division",
    rootGroup: group("AND", [
      cond("applicant_age", "between", "21", "58"),
      cond("monthly_income", ">=", "40000"),
      cond("loan_type", "=", "Personal Loan"),
      cond("risk_score", ">=", "55"),
    ]),
    actions: [
      { id: cid(), type: "Approve", reasonCode: "ELIGIBLE_PERSONAL_LOAN", message: "Applicant meets personal-loan underwriting criteria." },
      { id: cid(), type: "Calculate", outputField: "pl_eligible_amount", outputValue: "{{monthly_income}} * 60", outputType: "currency" },
      { id: cid(), type: "Calculate", outputField: "pl_emi_estimate", outputValue: "{{pl_eligible_amount}} * 0.0225", outputType: "currency" },
    ],
    elseActions: [
      { id: cid(), type: "Reject", reasonCode: "INELIGIBLE_PROFILE", message: "Applicant profile does not meet personal-loan eligibility thresholds." },
    ],
    createdDaysAgo: 6,
    updatedDaysAgo: 1,
  }),

  // COMPLEX 3 — insurance premium loading with OR root + nested AND.
  makeRule({
    id: "RL-503",
    name: "Life Cover High-Risk Premium Loading",
    domain: "Insurance",
    category: "Pricing",
    priority: 2,
    status: "Active",
    description:
      "Loads the base premium by 35% when the applicant is over 60, a smoker, has a medical history flag, or combines BMI ≥ 32 with a high-risk occupation; otherwise prices at standard.",
    owner: "Actuarial Underwriting",
    rootGroup: group("OR", [
      cond("applicant_age", ">", "60"),
      cond("smoker", "=", "true"),
      cond("medical_history", "=", "true"),
      group("AND", [
        cond("bmi", ">=", "32"),
        cond("occupation_type", "=", "High Risk"),
      ]),
    ]),
    actions: [
      { id: cid(), type: "Assign Value", outputField: "risk_category", outputValue: "High", outputType: "string" },
      { id: cid(), type: "Calculate", outputField: "loaded_premium", outputValue: "{{base_premium}} * 1.35", outputType: "currency" },
    ],
    elseActions: [
      { id: cid(), type: "Assign Value", outputField: "risk_category", outputValue: "Standard", outputType: "string" },
      { id: cid(), type: "Calculate", outputField: "loaded_premium", outputValue: "{{base_premium}} * 1", outputType: "currency" },
    ],
    createdDaysAgo: 5,
    updatedDaysAgo: 1,
  }),

  // COMPLEX 4 — card underwriting with alternative qualification paths.
  makeRule({
    id: "RL-504",
    name: "Platinum Card Underwriting Gate",
    domain: "CreditCards",
    category: "Underwriting",
    priority: 2,
    status: "Active",
    description:
      "Approves Platinum card requests for clean-repayment applicants 25+ holding ≤ 4 cards who either earn ₹18L+ annually or are Premium-segment with utilization ≤ 30%; sizes the limit at annual income ÷ 4. All other Platinum requests route to manual underwriting.",
    owner: "Product Strategy Team",
    rootGroup: group("AND", [
      cond("card_type_requested", "=", "Platinum"),
      cond("applicant_age", ">=", "25"),
      cond("late_payment_history", "=", "false"),
      cond("existing_cards_count", "<=", "4"),
      group("OR", [
        cond("annual_income", ">=", "1800000"),
        group("AND", [
          cond("segment", "=", "Premium"),
          cond("credit_utilization_ratio", "<=", "30"),
        ]),
      ]),
    ]),
    actions: [
      { id: cid(), type: "Approve", reasonCode: "CARD_APPROVED", message: "Platinum underwriting criteria satisfied." },
      { id: cid(), type: "Calculate", outputField: "approved_credit_limit", outputValue: "{{annual_income}} / 4", outputType: "currency" },
    ],
    elseActions: [
      { id: cid(), type: "Flag for Review", reasonCode: "MANUAL_UNDERWRITING", message: "Platinum request outside auto-approval criteria — route to underwriter." },
    ],
    createdDaysAgo: 5,
    updatedDaysAgo: 1,
  }),

  // COMPLEX 5 — collateral clearance with disbursal calculation.
  makeRule({
    id: "RL-505",
    name: "Gold Collateral LTV Clearance",
    domain: "NBFC",
    category: "Collateral",
    priority: 2,
    status: "Active",
    description:
      "Clears gold collateral of 75%+ purity appraised at ₹25,000+ when the requested LTV stays within the 75% regulatory cap, and computes the maximum disbursal from appraised value × LTV.",
    owner: "Asset Management Group",
    rootGroup: group("AND", [
      cond("collateral_type", "=", "Gold"),
      cond("purity_grade", ">=", "75"),
      cond("appraised_value", ">=", "25000"),
      cond("ltv_requested", "<=", "75"),
    ]),
    actions: [
      { id: cid(), type: "Approve", reasonCode: "COLLATERAL_CLEARED", message: "Collateral satisfies purity, value, and LTV policy." },
      { id: cid(), type: "Calculate", outputField: "max_disbursal_amount", outputValue: "{{appraised_value}} * {{ltv_requested}} / 100", outputType: "currency" },
    ],
    elseActions: [
      { id: cid(), type: "Flag for Review", reasonCode: "COLLATERAL_REVIEW", message: "Collateral outside standard policy — branch valuation review required." },
    ],
    createdDaysAgo: 4,
    updatedDaysAgo: 1,
  }),

  // SIMPLE 1 — field assignment on verification state.
  makeRule({
    id: "RL-506",
    name: "KYC Completion Status",
    domain: "Wealth",
    category: "Compliance",
    priority: 3,
    status: "Active",
    description: "Marks KYC as Completed once verification is confirmed; otherwise routes the applicant to the KYC pending queue.",
    owner: "Compliance Office",
    rootGroup: group("AND", [cond("kyc_verified", "=", "true")]),
    actions: [
      { id: cid(), type: "Assign Value", outputField: "kyc_status", outputValue: "Completed", outputType: "string" },
    ],
    elseActions: [
      { id: cid(), type: "Flag for Review", reasonCode: "KYC_PENDING", message: "KYC verification incomplete — documents required before onboarding." },
    ],
    createdDaysAgo: 4,
    updatedDaysAgo: 1,
  }),

  // SIMPLE 2 — hard regulatory gate.
  makeRule({
    id: "RL-507",
    name: "Minor Applicant Rejection",
    domain: "Lending",
    category: "Compliance",
    priority: 1,
    status: "Active",
    description: "Rejects any application where the applicant is under 18 — minors cannot contract for credit.",
    owner: "Compliance Office",
    rootGroup: group("AND", [cond("applicant_age", "<", "18")]),
    actions: [
      { id: cid(), type: "Reject", reasonCode: "MINOR_APPLICANT", message: "Applicant is a minor — credit cannot be extended under 18." },
    ],
    createdDaysAgo: 4,
    updatedDaysAgo: 1,
  }),

  // SIMPLE 3 — segment-based fee assignment.
  makeRule({
    id: "RL-508",
    name: "Premium Segment Fee Waiver",
    domain: "Lending",
    category: "Pricing",
    priority: 3,
    status: "Active",
    description: "Waives the processing fee for Premium-segment customers; standard applicants pay the published ₹1,999 fee.",
    owner: "Product Strategy Team",
    rootGroup: group("AND", [cond("segment", "=", "Premium")]),
    actions: [
      { id: cid(), type: "Assign Value", outputField: "processing_fee", outputValue: "0", outputType: "currency" },
    ],
    elseActions: [
      { id: cid(), type: "Assign Value", outputField: "processing_fee", outputValue: "1999", outputType: "currency" },
    ],
    createdDaysAgo: 4,
    updatedDaysAgo: 1,
  }),

  // COMPLEX — third hop in the Personal Loan chain (RL-501 → RL-502 → RL-514):
  // deducts the applicant's existing monthly liabilities from RL-502's
  // pl_eligible_amount to produce the real, disbursable approved_loan_amount.
  // Liabilities are annuitized at the same 60x multiple RL-502 uses to size
  // the eligible amount in the first place, so both sides of the subtraction
  // are on the same footing. Gated to dti_ratio <= 45 so the deduction can
  // never exceed 45% of the eligible amount — the result is guaranteed
  // positive by construction, never a negative "approved" figure.
  makeRule({
    id: "RL-514",
    name: "Personal Loan Liability-Adjusted Final Amount",
    domain: "Lending",
    category: "Eligibility",
    priority: 1,
    status: "Active",
    description:
      "Chains on Personal Loan Eligibility & Limit's pl_eligible_amount: deducts existing monthly liabilities (annuitized at the same 60x multiple used to size the eligible amount) to produce the final approved_loan_amount. An applicant with no liabilities gets the full eligible amount unchanged.",
    owner: "Credit Risk Division",
    rootGroup: group("AND", [
      cond("pl_eligible_amount", ">", "0"),
      cond("monthly_liabilities", ">=", "0"),
      cond("dti_ratio", "<=", "45"),
    ]),
    actions: [
      { id: cid(), type: "Calculate", outputField: "liability_deduction_amount", outputValue: "{{monthly_liabilities}} * 60", outputType: "currency" },
      { id: cid(), type: "Calculate", outputField: "approved_loan_amount", outputValue: "{{pl_eligible_amount}} - {{liability_deduction_amount}}", outputType: "currency" },
      { id: cid(), type: "Show Message", message: "Final approved amount reflects a deduction for existing monthly liabilities." },
    ],
    createdDaysAgo: 0,
    updatedDaysAgo: 0,
  }),

  // ============================================================
  // MAKER-CHECKER DEMO PACK (RL-509…RL-513) — status: "Testing", each paired
  // with a matching entry in DEFAULT_APPROVAL_REQUESTS (stage "Pending
  // Review") below, exactly mirroring what store.ts's submitForReview()
  // produces for a real submission. Not mapped to any product, so they
  // don't affect any live simulator outcome — purely to give "Rules
  // Awaiting Review" / "Pending Review" / "Approval Queue" real demo data
  // instead of the empty state.
  // ============================================================
  makeRule({
    id: "RL-509",
    name: "Self-Employed Income Stability Check",
    domain: "Lending",
    category: "Eligibility",
    priority: 2,
    status: "Testing",
    description: "Approves self-employed applicants directly once their income clears an enhanced stability threshold; others route to manual review.",
    owner: "Credit Risk Division",
    rootGroup: group("AND", [
      cond("employment_type", "=", "Self-Employed"),
      cond("monthly_income", ">=", "60000"),
    ]),
    actions: [
      { id: cid(), type: "Approve", reasonCode: "ELIGIBLE_STABLE_INCOME", message: "Self-employed applicant demonstrates stable income above the enhanced threshold." },
    ],
    elseActions: [
      { id: cid(), type: "Flag for Review", reasonCode: "SELF_EMPLOYED_INCOME_REVIEW", message: "Self-employed applicant income below the enhanced stability threshold — manual review required." },
    ],
    createdDaysAgo: 2,
    updatedDaysAgo: 2,
  }),
  makeRule({
    id: "RL-510",
    name: "Elevated BMI Risk Loading",
    domain: "Insurance",
    category: "Risk & Fraud",
    priority: 3,
    status: "Testing",
    description: "Flags applicants with an elevated BMI for underwriter review and proposes a risk-loading percentage on the base premium.",
    owner: "Actuarial Underwriting",
    rootGroup: group("AND", [cond("bmi", ">=", "30")]),
    actions: [
      { id: cid(), type: "Assign Value", outputField: "risk_loading_percent", outputValue: "15", outputType: "number" },
      { id: cid(), type: "Flag for Review", reasonCode: "ELEVATED_BMI_REVIEW", message: "BMI indicates elevated health risk — underwriter review required before final premium." },
    ],
    createdDaysAgo: 1,
    updatedDaysAgo: 1,
  }),
  makeRule({
    id: "RL-511",
    name: "Vehicle Collateral Minimum Valuation",
    domain: "NBFC",
    category: "Collateral",
    priority: 2,
    status: "Testing",
    description: "Declines vehicle-backed collateral whose appraised value falls below the minimum acceptable threshold for this scheme.",
    owner: "Asset Management Group",
    rootGroup: group("AND", [
      cond("collateral_type", "=", "Vehicle"),
      cond("appraised_value", "<", "100000"),
    ]),
    actions: [
      { id: cid(), type: "Reject", reasonCode: "COLLATERAL_BELOW_MIN", message: "Vehicle collateral appraised value is below the minimum acceptable threshold." },
    ],
    createdDaysAgo: 3,
    updatedDaysAgo: 3,
  }),
  makeRule({
    id: "RL-512",
    name: "Festive Season Rate Discount",
    domain: "Lending",
    category: "Pricing",
    priority: 4,
    status: "Testing",
    description: "Applies a promotional interest rate to Personal Loan applications during the festive campaign window.",
    owner: "Product Strategy Team",
    rootGroup: group("AND", [cond("loan_type", "=", "Personal Loan")]),
    actions: [
      { id: cid(), type: "Assign Value", outputField: "interest_rate", outputValue: "9.5", outputType: "number" },
      { id: cid(), type: "Show Message", message: "Festive season promotional rate applied." },
    ],
    createdDaysAgo: 0.2,
    updatedDaysAgo: 0.2,
  }),
  makeRule({
    id: "RL-513",
    name: "Platinum Card Utilization Alert",
    domain: "CreditCards",
    category: "Risk & Fraud",
    priority: 3,
    status: "Testing",
    description: "Flags Platinum cardholders whose credit utilization exceeds 80% for risk review ahead of their next limit renewal.",
    owner: "Credit Risk Division",
    rootGroup: group("AND", [
      cond("card_type_requested", "=", "Platinum"),
      cond("credit_utilization_ratio", ">=", "80"),
    ]),
    actions: [
      { id: cid(), type: "Flag for Review", reasonCode: "HIGH_UTILIZATION_ALERT", message: "Platinum cardholder utilization exceeds 80% — risk review required before limit renewal." },
    ],
    createdDaysAgo: 4,
    updatedDaysAgo: 4,
  }),
];

// ============================================================
// FILLER RULES — pad repository/dashboard to enterprise scale.
// Always non-blocking (Show Message) so they never affect the
// live simulator outcome; only Draft/Inactive/Archived status
// keeps the "wired" Active core rules fully in control.
// ============================================================
const FILLER_DOMAINS: Domain[] = ["Lending", "Insurance", "NBFC"];
const FILLER_FIELDS: Record<Domain, string[]> = {
  Lending: ["credit_score", "monthly_income", "loan_amount", "employment_type", "applicant_age"],
  Insurance: ["bmi", "sum_assured", "occupation_type", "applicant_age", "base_premium"],
  NBFC: ["appraised_value", "purity_grade", "ltv_requested", "collateral_type"],
};
const FILLER_NAME_STEMS = [
  "Legacy Threshold Review", "Regional Pricing Adjustment", "Channel Eligibility Note",
  "Seasonal Campaign Flag", "Partner Portal Variance Check", "Document Completeness Note",
  "Secondary Verification Flag", "Cross-Sell Eligibility Tag", "Retention Offer Check",
  "Portfolio Concentration Note", "Legacy System Migration Flag", "Batch Reconciliation Note",
  "Onboarding Friction Check", "Channel Mix Adjustment", "Promotional Rate Note",
  "Data Quality Flag", "Regulatory Watchlist Note", "Backoffice Escalation Tag",
];

function generateFillerRules(count: number): BusinessRule[] {
  const statuses: RuleStatus[] = ["Active", "Active", "Active", "Active", "Draft", "Draft", "Inactive", "Archived"];
  const out: BusinessRule[] = [];
  for (let i = 0; i < count; i++) {
    const domain = pick(FILLER_DOMAINS);
    const field = pick(FILLER_FIELDS[domain]);
    const status = pick(statuses);
    const stem = pick(FILLER_NAME_STEMS);
    ruleCounter += 1;
    const opNum = rng() > 0.5 ? ">" : "<";
    const val = Math.floor(rng() * 500 + 10);
    out.push(
      makeRule({
        id: `RL-${ruleCounter}`,
        name: `${stem} #${ruleCounter}`,
        domain,
        category: pick(DEFAULT_RULE_CATEGORIES).name,
        priority: (Math.ceil(rng() * 5) as Priority),
        status,
        description: `Supporting configuration rule covering ${field.replace(/_/g, " ")} variance handling for ${domain.toLowerCase()} operations.`,
        owner: pick(DEFAULT_OWNERS),
        rootGroup: group("AND", [cond(field, opNum, String(val))]),
        actions: [{ id: cid(), type: "Show Message", reasonCode: "INFO_FLAG", message: "Informational flag — does not affect final decision." }],
        createdDaysAgo: Math.floor(rng() * 150) + 1,
        updatedDaysAgo: Math.floor(rng() * 30),
        simulatable: false,
      })
    );
  }
  return out;
}

export const ALL_RULES: BusinessRule[] = [...CORE_RULES, ...generateFillerRules(98)];

// ============================================================
// DECISION MATRICES
// ============================================================
export const MATRICES: DecisionMatrix[] = [
  {
    id: "MTX-LEND-01",
    domain: "Lending",
    lookupType: "interest-rate",
    name: "Bank Risk-Tiered Core Pricing Slabs",
    description: "Maps bureau credit score bands to interest rate multipliers and processing workflow.",
    columns: [
      { key: "scoreMin", label: "Score Min", type: "number" },
      { key: "scoreMax", label: "Score Max", type: "number" },
      { key: "interestRate", label: "Interest Rate", type: "percent", unit: "%" },
      { key: "workflow", label: "Workflow Assignment", type: "text" },
    ],
    rangeColumns: ["scoreMin", "scoreMax"],
    rows: [
      { id: "R1", values: { scoreMin: 800, scoreMax: 900, interestRate: 8.5, workflow: "Preferred Underwriting Stream" } },
      { id: "R2", values: { scoreMin: 750, scoreMax: 799, interestRate: 9.0, workflow: "Standard Processing Queue" } },
      { id: "R3", values: { scoreMin: 700, scoreMax: 749, interestRate: 10.0, workflow: "Enhanced Monitoring" } },
      { id: "R4", values: { scoreMin: 650, scoreMax: 699, interestRate: 11.5, workflow: "Co-Signer Evaluation Required" } },
    ],
    updatedAt: daysAgo(2),
  },
  {
    id: "MTX-NBFC-01",
    domain: "NBFC",
    lookupType: "haircut",
    name: "Asset Allocation Haircut & LTV Matrix",
    description: "Defines haircut margin and eligible LTV ceiling by collateral type and appraised value tier.",
    columns: [
      { key: "collateralType", label: "Collateral Type", type: "select", options: ["Gold", "Vehicle", "Property"] },
      { key: "minValue", label: "Min Value (₹)", type: "currency" },
      { key: "haircutPercent", label: "Haircut %", type: "percent", unit: "%" },
      { key: "maxLtv", label: "Max LTV %", type: "percent", unit: "%" },
    ],
    rows: [
      { id: "R1", values: { collateralType: "Gold", minValue: 50000, haircutPercent: 25, maxLtv: 75 } },
      { id: "R2", values: { collateralType: "Gold", minValue: 500000, haircutPercent: 22, maxLtv: 78 } },
      { id: "R3", values: { collateralType: "Vehicle", minValue: 50000, haircutPercent: 40, maxLtv: 60 } },
      { id: "R4", values: { collateralType: "Vehicle", minValue: 800000, haircutPercent: 35, maxLtv: 65 } },
      { id: "R5", values: { collateralType: "Property", minValue: 500000, haircutPercent: 30, maxLtv: 70 } },
    ],
    updatedAt: daysAgo(5),
  },
  {
    id: "MTX-INS-01",
    domain: "Insurance",
    lookupType: "premium",
    name: "Insurance Premium Rate Slabs",
    description: "Determines base premium and smoker risk loading by applicant age band.",
    columns: [
      { key: "ageMin", label: "Age Min", type: "number" },
      { key: "ageMax", label: "Age Max", type: "number" },
      { key: "smoker", label: "Smoker", type: "select", options: ["No", "Yes"] },
      { key: "basePremium", label: "Base Premium (₹)", type: "currency" },
      { key: "riskLoadingPercent", label: "Risk Loading %", type: "percent", unit: "%" },
    ],
    rangeColumns: ["ageMin", "ageMax"],
    rows: [
      { id: "R1", values: { ageMin: 18, ageMax: 30, smoker: "No", basePremium: 10000, riskLoadingPercent: 0 } },
      { id: "R2", values: { ageMin: 18, ageMax: 30, smoker: "Yes", basePremium: 10000, riskLoadingPercent: 20 } },
      { id: "R3", values: { ageMin: 31, ageMax: 45, smoker: "No", basePremium: 12000, riskLoadingPercent: 0 } },
      { id: "R4", values: { ageMin: 31, ageMax: 45, smoker: "Yes", basePremium: 12000, riskLoadingPercent: 20 } },
      { id: "R5", values: { ageMin: 46, ageMax: 60, smoker: "No", basePremium: 16000, riskLoadingPercent: 0 } },
      { id: "R6", values: { ageMin: 46, ageMax: 60, smoker: "Yes", basePremium: 16000, riskLoadingPercent: 35 } },
    ],
    updatedAt: daysAgo(1),
  },
];

// ============================================================
// AUDIT LOG
// ============================================================
export const AUDIT_LOG: AuditEntry[] = buildHashChain([
  { id: "A1", timestamp: daysAgo(0.05), user: "Jyoti Sonani", action: "Published Rule", entity: "BusinessRule", entityId: "RL-101", details: "Status changed Draft → Active." },
  { id: "A9", timestamp: daysAgo(0.2), user: "Ananya Verma", action: "Submitted for Review", entity: "BusinessRule", entityId: "RL-512", details: "Festive Season Rate Discount moved to Testing and queued for review." },
  { id: "A2", timestamp: daysAgo(0.3), user: "Naveen Kumar", action: "Edited Matrix", entity: "DecisionMatrix", entityId: "MTX-LEND-01", details: "Updated interest rate for 650–699 band from 12.0% to 11.5%." },
  { id: "A3", timestamp: daysAgo(0.5), user: "Radhe", action: "Ran Simulation", entity: "Simulation", entityId: "SIM-4471", details: "Digital Lending scenario, outcome Approved." },
  { id: "A4", timestamp: daysAgo(1), user: "Saurabh Anand", action: "Cloned Rule", entity: "BusinessRule", entityId: "RL-206", details: "Cloned to RL-2061 as Draft." },
  { id: "A10", timestamp: daysAgo(1), user: "Ananya Verma", action: "Submitted for Review", entity: "BusinessRule", entityId: "RL-510", details: "Elevated BMI Risk Loading moved to Testing and queued for review." },
  { id: "A5", timestamp: daysAgo(1.4), user: "Shivang Sharma", action: "Save Failed", entity: "BusinessRule", entityId: "RL-303", details: "Validation error: mandatory Value field missing." },
  { id: "A6", timestamp: daysAgo(2), user: "System", action: "Export Delivered", entity: "Report", entityId: "RPT-WEEKLY-14", details: "CSV export delivered to risk-ops@qualtechedge.com." },
  { id: "A11", timestamp: daysAgo(2), user: "Ananya Verma", action: "Submitted for Review", entity: "BusinessRule", entityId: "RL-509", details: "Self-Employed Income Stability Check moved to Testing and queued for review." },
  { id: "A12", timestamp: daysAgo(3), user: "Ananya Verma", action: "Submitted for Review", entity: "BusinessRule", entityId: "RL-511", details: "Vehicle Collateral Minimum Valuation moved to Testing and queued for review." },
  { id: "A7", timestamp: daysAgo(4), user: "Ashutosh Vishwakarma", action: "Disabled Rule", entity: "BusinessRule", entityId: "RL-109", details: "Status changed Active → Inactive." },
  { id: "A13", timestamp: daysAgo(4), user: "Ananya Verma", action: "Submitted for Review", entity: "BusinessRule", entityId: "RL-513", details: "Platinum Card Utilization Alert moved to Testing and queued for review." },
  { id: "A8", timestamp: daysAgo(6), user: "Jyoti Sonani", action: "Created Rule", entity: "BusinessRule", entityId: "RL-108", details: "New Draft rule created in Compliance category." },
]);

// Mirrors what store.ts's submitForReview() creates for a real submission —
// one entry per RL-509…RL-513 above, all still awaiting their assigned
// reviewer (see DEFAULT_USERS' approvalCategories: Kavita Rao (Credit/Risk
// Manager)→Eligibility/Risk & Fraud, Arjun Nair (Underwriter/Claims)→
// Underwriting/Claims/Collateral, Rohan Mehta (Product Manager)→Pricing).
export const DEFAULT_APPROVAL_REQUESTS: ApprovalRequest[] = [
  { id: "AR-1", ruleId: "RL-509", stage: "Pending Review", requestedBy: "Ananya Verma", requestedAt: daysAgo(2) },
  { id: "AR-2", ruleId: "RL-510", stage: "Pending Review", requestedBy: "Ananya Verma", requestedAt: daysAgo(1) },
  { id: "AR-3", ruleId: "RL-511", stage: "Pending Review", requestedBy: "Ananya Verma", requestedAt: daysAgo(3) },
  { id: "AR-4", ruleId: "RL-512", stage: "Pending Review", requestedBy: "Ananya Verma", requestedAt: daysAgo(0.2) },
  { id: "AR-5", ruleId: "RL-513", stage: "Pending Review", requestedBy: "Ananya Verma", requestedAt: daysAgo(4) },
];

// Rejected-outcome simulation history — the "Failed Simulations" KPI
// (Underwriter/Operations dashboards) and Product Workspace's Simulation
// History tab both read the store's global `simulations` array, which
// starts empty until a real user runs one. Each entry below reuses a real
// ACTIVE reject rule's actual condition/action, with a full evaluation-order
// trace (rules before the reject shown as genuinely Failed/benign, rules
// after it Skipped — exactly how runRulesForCase's Reject-halts behavior
// works), so expanding one in the UI looks byte-for-byte like a real run.
export const DEFAULT_SIMULATIONS: SimulationResult[] = [
  {
    id: "SIM-DEMO-1",
    domain: "Lending",
    productId: "prod-home-loan",
    outcome: "Rejected",
    reasonCode: "LOW_CREDIT_SCORE",
    summary: "Credit score below minimum threshold of 650.",
    calculatedValues: {},
    triggeredRules: ["RL-101"],
    decidingRuleId: "RL-101",
    trace: [
      {
        ruleId: "RL-101", ruleName: "Minimum Credit Score Validation", priority: 1, status: "Passed", branch: "then",
        conditionSummaries: [{ field: "Bureau Credit Score", operator: "<", expected: "650", actual: "590", passed: true }],
        actionsApplied: [{ id: "sim1-a1", type: "Reject", reasonCode: "LOW_CREDIT_SCORE", message: "Credit score below minimum threshold of 650." }],
        durationMs: 0.42,
      },
      { ruleId: "RL-103", ruleName: "Minimum Age Validation", priority: 1, status: "Skipped", conditionSummaries: [], actionsApplied: [], durationMs: 0 },
      { ruleId: "RL-104", ruleName: "Debt-to-Income Ratio Cap", priority: 2, status: "Skipped", conditionSummaries: [], actionsApplied: [], durationMs: 0 },
      { ruleId: "RL-106", ruleName: "Standard Lending Approval", priority: 5, status: "Skipped", conditionSummaries: [], actionsApplied: [], durationMs: 0 },
      { ruleId: "RL-110", ruleName: "Home Loan Eligibility – Standard Approval", priority: 3, status: "Skipped", conditionSummaries: [], actionsApplied: [], durationMs: 0 },
    ],
    input: { credit_score: 590, applicant_age: 29, dti_ratio: 32, monthly_income: 45000, monthly_liabilities: 14000, employment_type: "Salaried", loan_amount: 2500000, loan_type: "Home Loan", city: "Pune" },
    timestamp: daysAgo(1.5),
    totalDurationMs: 0.6,
  },
  {
    id: "SIM-DEMO-2",
    domain: "Lending",
    productId: "prod-home-loan",
    outcome: "Rejected",
    reasonCode: "HIGH_DTI",
    summary: "Debt-to-income ratio of 50% or higher exceeds policy limit.",
    calculatedValues: {},
    triggeredRules: ["RL-104"],
    decidingRuleId: "RL-104",
    trace: [
      { ruleId: "RL-101", ruleName: "Minimum Credit Score Validation", priority: 1, status: "Failed", conditionSummaries: [{ field: "Bureau Credit Score", operator: "<", expected: "650", actual: "705", passed: false }], actionsApplied: [], durationMs: 0.2 },
      { ruleId: "RL-103", ruleName: "Minimum Age Validation", priority: 1, status: "Failed", conditionSummaries: [{ field: "Applicant Age", operator: "<", expected: "21", actual: "34", passed: false }], actionsApplied: [], durationMs: 0.1 },
      {
        ruleId: "RL-104", ruleName: "Debt-to-Income Ratio Cap", priority: 2, status: "Passed", branch: "then",
        conditionSummaries: [{ field: "Debt-to-Income Ratio", operator: ">=", expected: "50", actual: "58", passed: true }],
        actionsApplied: [{ id: "sim2-a1", type: "Reject", reasonCode: "HIGH_DTI", message: "Debt-to-income ratio of 50% or higher exceeds policy limit." }],
        durationMs: 0.3,
      },
      { ruleId: "RL-106", ruleName: "Standard Lending Approval", priority: 5, status: "Skipped", conditionSummaries: [], actionsApplied: [], durationMs: 0 },
      { ruleId: "RL-110", ruleName: "Home Loan Eligibility – Standard Approval", priority: 3, status: "Skipped", conditionSummaries: [], actionsApplied: [], durationMs: 0 },
    ],
    input: { credit_score: 705, applicant_age: 34, dti_ratio: 58, monthly_income: 40000, monthly_liabilities: 23200, employment_type: "Self-Employed", loan_amount: 3000000, loan_type: "Home Loan", city: "Chennai" },
    timestamp: daysAgo(3),
    totalDurationMs: 0.6,
  },
  {
    id: "SIM-DEMO-3",
    domain: "Insurance",
    productId: "prod-term-life",
    outcome: "Rejected",
    reasonCode: "UNDERAGE_APPLICANT",
    summary: "Applicant is below the minimum insurable age of 18.",
    calculatedValues: {},
    triggeredRules: ["RL-202"],
    decidingRuleId: "RL-202",
    trace: [
      {
        ruleId: "RL-202", ruleName: "Minimum Age for Coverage", priority: 1, status: "Passed", branch: "then",
        conditionSummaries: [{ field: "Applicant Age", operator: "<", expected: "18", actual: "16", passed: true }],
        actionsApplied: [{ id: "sim3-a1", type: "Reject", reasonCode: "UNDERAGE_APPLICANT", message: "Applicant is below the minimum insurable age of 18." }],
        durationMs: 0.3,
      },
      { ruleId: "RL-201", ruleName: "Smoker Risk Classification", priority: 2, status: "Skipped", conditionSummaries: [], actionsApplied: [], durationMs: 0 },
      { ruleId: "RL-207", ruleName: "Standard Policy Approval", priority: 5, status: "Skipped", conditionSummaries: [], actionsApplied: [], durationMs: 0 },
      { ruleId: "RL-209", ruleName: "Insurance High Risk Occupation Check", priority: 2, status: "Skipped", conditionSummaries: [], actionsApplied: [], durationMs: 0 },
    ],
    input: { applicant_age: 16, smoker: false, occupation_type: "Low Risk", bmi: 22, sum_assured: 1000000, base_premium: 8000 },
    timestamp: daysAgo(2.2),
    totalDurationMs: 0.4,
  },
  {
    id: "SIM-DEMO-4",
    domain: "NBFC",
    productId: "prod-gold-loan",
    outcome: "Rejected",
    reasonCode: "UNSUPPORTED_COLLATERAL",
    summary: "Securities are not accepted as collateral under current policy.",
    calculatedValues: {},
    triggeredRules: ["RL-301"],
    decidingRuleId: "RL-301",
    trace: [
      {
        ruleId: "RL-301", ruleName: "Unsupported Collateral Exclusion", priority: 1, status: "Passed", branch: "then",
        conditionSummaries: [{ field: "Collateral Asset Type", operator: "=", expected: "Securities", actual: "Securities", passed: true }],
        actionsApplied: [{ id: "sim4-a1", type: "Reject", reasonCode: "UNSUPPORTED_COLLATERAL", message: "Securities are not accepted as collateral under current policy." }],
        durationMs: 0.3,
      },
      { ruleId: "RL-302", ruleName: "Minimum Appraised Value Threshold", priority: 2, status: "Skipped", conditionSummaries: [], actionsApplied: [], durationMs: 0 },
      { ruleId: "RL-306", ruleName: "Standard Collateral Approval", priority: 5, status: "Skipped", conditionSummaries: [], actionsApplied: [], durationMs: 0 },
      { ruleId: "RL-308", ruleName: "Gold Loan High LTV Review", priority: 2, status: "Skipped", conditionSummaries: [], actionsApplied: [], durationMs: 0 },
    ],
    input: { collateral_type: "Securities", appraised_value: 250000, purity_grade: 0, ltv_requested: 60 },
    timestamp: daysAgo(4),
    totalDurationMs: 0.4,
  },
  {
    id: "SIM-DEMO-5",
    domain: "CreditCards",
    productId: "prod-credit-card",
    outcome: "Rejected",
    reasonCode: "INSUFFICIENT_INCOME",
    summary: "Annual income is below the minimum required for card issuance.",
    calculatedValues: {},
    triggeredRules: ["RL-601"],
    decidingRuleId: "RL-601",
    trace: [
      {
        ruleId: "RL-601", ruleName: "Minimum Income Eligibility", priority: 1, status: "Passed", branch: "then",
        conditionSummaries: [{ field: "Annual Income", operator: "<", expected: "300000", actual: "220000", passed: true }],
        actionsApplied: [{ id: "sim5-a1", type: "Reject", reasonCode: "INSUFFICIENT_INCOME", message: "Annual income is below the minimum required for card issuance." }],
        durationMs: 0.3,
      },
      { ruleId: "RL-602", ruleName: "Excessive Credit Utilization Exclusion", priority: 2, status: "Skipped", conditionSummaries: [], actionsApplied: [], durationMs: 0 },
      { ruleId: "RL-603", ruleName: "High Limit Request Manager Review", priority: 3, status: "Skipped", conditionSummaries: [], actionsApplied: [], durationMs: 0 },
      { ruleId: "RL-604", ruleName: "Standard Card Approval", priority: 5, status: "Skipped", conditionSummaries: [], actionsApplied: [], durationMs: 0 },
      { ruleId: "RL-605", ruleName: "Credit Card Platinum Eligibility", priority: 3, status: "Skipped", conditionSummaries: [], actionsApplied: [], durationMs: 0 },
    ],
    input: { annual_income: 220000, requested_credit_limit: 150000, credit_utilization_ratio: 35, existing_cards_count: 1, card_type_requested: "Standard", late_payment_history: false },
    timestamp: daysAgo(0.8),
    totalDurationMs: 0.5,
  },
];

export const RECENT_DEPLOYMENTS = [
  { id: "D1", ruleId: "RL-101", ruleName: "Minimum Credit Score Validation", domain: "Lending" as Domain, timestamp: daysAgo(0.05), status: "Live" as const },
  { id: "D2", ruleId: "RL-201", ruleName: "Smoker Risk Classification", domain: "Insurance" as Domain, timestamp: daysAgo(3), status: "Live" as const },
  { id: "D3", ruleId: "RL-304", ruleName: "LTV Ceiling Guardrail", domain: "NBFC" as Domain, timestamp: daysAgo(9), status: "Live" as const },
  { id: "D4", ruleId: "RL-108", ruleName: "Non-Metro KYC Compliance Check", domain: "Lending" as Domain, timestamp: daysAgo(6), status: "Pending" as const },
];

// ============================================================
// ROLES — seeded 1:1 from BRD §5.4's Target Role-Based Access Matrix, loaded
// from src/data/roles.json (personaName + icon power the "Switch Role" demo
// picker). Fully renameable/editable via the Configuration Studio;
// enforcement is client-side only (no backend in this prototype).
// ============================================================
export const DEFAULT_ROLES: Role[] = rolesData as Role[];

// ============================================================
// RULE GROUPS — organizational collections, independent of Category.
// ============================================================
export const DEFAULT_RULE_GROUPS: RuleGroup[] = [
  { id: "grp-core-eligibility", name: "Core Eligibility Bundle", description: "The baseline pass/fail checks every application must clear first." },
  { id: "grp-risk-review", name: "Risk & Compliance Review", description: "Rules that flag a case for manual review rather than an automatic decision." },
  { id: "grp-pricing", name: "Pricing & Calculation", description: "Rules that compute or adjust a numeric outcome rather than approve/reject." },
];

// ============================================================
// PRODUCT MASTER + PRODUCT-RULE MAPPING — a Product is just a configurable
// named scheme a client offers (Home Loan, Auto Loan, ...); which rules apply
// to it is entirely data (ProductRuleMapping), not code. Seeded here so the
// new Studio pages and Simulator aren't empty on first load.
// ============================================================

const PRODUCT_SEED_TIMESTAMP = "2026-01-15T09:00:00.000Z";

export const DEFAULT_PRODUCTS: Product[] = [
  { id: "prod-home-loan", name: "Home Loan", code: "HOME_LOAN", domain: "Lending", description: "Standard salaried/self-employed home loan scheme.", status: "Active", publishStatus: "Published", lastPublishedAt: PRODUCT_SEED_TIMESTAMP, createdAt: PRODUCT_SEED_TIMESTAMP, updatedAt: PRODUCT_SEED_TIMESTAMP },
  { id: "prod-auto-loan", name: "Auto Loan", code: "AUTO_LOAN", domain: "Lending", description: "New/used vehicle purchase financing.", status: "Active", publishStatus: "Draft", createdAt: PRODUCT_SEED_TIMESTAMP, updatedAt: PRODUCT_SEED_TIMESTAMP },
  { id: "prod-term-life", name: "Term Life Cover", code: "TERM_LIFE", domain: "Insurance", description: "Pure protection term life plan.", status: "Active", publishStatus: "Published", lastPublishedAt: PRODUCT_SEED_TIMESTAMP, createdAt: PRODUCT_SEED_TIMESTAMP, updatedAt: PRODUCT_SEED_TIMESTAMP },
  { id: "prod-gold-loan", name: "Gold Loan", code: "GOLD_LOAN", domain: "NBFC", description: "Collateral-backed gold loan scheme.", status: "Active", publishStatus: "Draft", createdAt: PRODUCT_SEED_TIMESTAMP, updatedAt: PRODUCT_SEED_TIMESTAMP },
  { id: "prod-credit-card", name: "Rewards Credit Card", code: "REWARDS_CARD", domain: "CreditCards", description: "Unsecured revolving credit card with tiered rewards.", status: "Active", publishStatus: "Draft", createdAt: PRODUCT_SEED_TIMESTAMP, updatedAt: PRODUCT_SEED_TIMESTAMP },
  { id: "prod-wealth-plan", name: "Managed Portfolio Plan", code: "WEALTH_PLAN", domain: "Wealth", description: "Advisor-managed investment portfolio onboarding.", status: "Active", publishStatus: "Draft", createdAt: PRODUCT_SEED_TIMESTAMP, updatedAt: PRODUCT_SEED_TIMESTAMP },
  { id: "prod-home-loan-demo", name: "Home Loan — Demo", code: "HOME_LOAN_DEMO", domain: "Lending", description: "4-rule chained showcase: IF, WHERE, CASE, GROUP rule types executed in Product Master sequence.", status: "Active", publishStatus: "Published", lastPublishedAt: PRODUCT_SEED_TIMESTAMP, createdAt: PRODUCT_SEED_TIMESTAMP, updatedAt: PRODUCT_SEED_TIMESTAMP },
  { id: "prod-personal-loan", name: "Personal Loan", code: "PERSONAL_LOAN", domain: "Lending", description: "Unsecured personal loan with chained risk-scoring and limit sizing.", status: "Active", publishStatus: "Draft", createdAt: PRODUCT_SEED_TIMESTAMP, updatedAt: PRODUCT_SEED_TIMESTAMP },
];

function mapping(id: string, productId: string, ruleId: string, order: number): ProductRuleMapping {
  return { id, productId, ruleId, active: true, order, createdAt: PRODUCT_SEED_TIMESTAMP };
}

export const DEFAULT_PRODUCT_RULE_MAPPINGS: ProductRuleMapping[] = [
  mapping("prm-1", "prod-home-loan", "RL-101", 0),
  mapping("prm-2", "prod-home-loan", "RL-103", 1),
  mapping("prm-3", "prod-home-loan", "RL-104", 2),
  mapping("prm-4", "prod-home-loan", "RL-106", 3),
  mapping("prm-home-loan-demo", "prod-home-loan", "RL-110", 4),
  mapping("prm-5", "prod-auto-loan", "RL-103", 0),
  mapping("prm-6", "prod-auto-loan", "RL-107", 1),
  // prm-11: baseline approval — Auto Loan had no rule that ever produced an
  // explicit Approved outcome (only a reject + a review rule); reuses the
  // same unconditional "Standard Lending Approval" already mapped to Home
  // Loan so both Lending products have a real positive demo path.
  mapping("prm-11", "prod-auto-loan", "RL-106", 2),
  mapping("prm-auto-loan-dti", "prod-auto-loan", "RL-112", 3),
  mapping("prm-7", "prod-term-life", "RL-202", 0),
  mapping("prm-8", "prod-term-life", "RL-201", 1),
  // prm-12: same gap/fix as prm-11, for Term Life Cover.
  mapping("prm-12", "prod-term-life", "RL-207", 2),
  mapping("prm-term-life-hazardous-occ", "prod-term-life", "RL-209", 3),
  mapping("prm-9", "prod-gold-loan", "RL-301", 0),
  mapping("prm-10", "prod-gold-loan", "RL-302", 1),
  // prm-13: same gap/fix as prm-11, for Gold Loan.
  mapping("prm-13", "prod-gold-loan", "RL-306", 2),
  mapping("prm-gold-loan-ltv", "prod-gold-loan", "RL-308", 3),
  mapping("prm-14", "prod-credit-card", "RL-601", 0),
  mapping("prm-15", "prod-credit-card", "RL-602", 1),
  mapping("prm-16", "prod-credit-card", "RL-603", 2),
  mapping("prm-17", "prod-credit-card", "RL-604", 3),
  mapping("prm-credit-card-platinum", "prod-credit-card", "RL-605", 4),
  mapping("prm-18", "prod-wealth-plan", "RL-701", 0),
  mapping("prm-19", "prod-wealth-plan", "RL-702", 1),
  mapping("prm-20", "prod-wealth-plan", "RL-703", 2),
  mapping("prm-21", "prod-wealth-plan", "RL-704", 3),
  mapping("prm-wealth-plan-mod-risk", "prod-wealth-plan", "RL-705", 4),
  mapping("prm-auto-loan-risk-gate", "prod-auto-loan", "RL-113", 4),
  mapping("prm-hld-1", "prod-home-loan-demo", "RL-114", 0),
  mapping("prm-hld-2", "prod-home-loan-demo", "RL-115", 1),
  mapping("prm-hld-3", "prod-home-loan-demo", "RL-116", 2),
  mapping("prm-hld-4", "prod-home-loan-demo", "RL-117", 3),
  // Personal Loan — sequenced to demonstrate chaining: the minor gate rejects
  // first, RL-501 produces risk_score, RL-502 consumes it into pl_eligible_amount,
  // RL-514 deducts liabilities into approved_loan_amount, RL-508 prices fees.
  mapping("prm-pl-minor-gate", "prod-personal-loan", "RL-507", 0),
  mapping("prm-pl-risk-grade", "prod-personal-loan", "RL-501", 1),
  mapping("prm-pl-eligibility", "prod-personal-loan", "RL-502", 2),
  mapping("prm-pl-liability-adjust", "prod-personal-loan", "RL-514", 3),
  mapping("prm-pl-fee-waiver", "prod-personal-loan", "RL-508", 4),
];

// Moved from the store's initial state (was previously inlined there) so
// every seed array lives in one place, same as products/rules/mappings above.
export const DEFAULT_JSON_MAPPINGS: JsonMapping[] = [
  {
    id: "loan-decision-response",
    name: "Loan Decision Response",
    industry: "Lending",
    productId: undefined,
    direction: "response",
    entries: [
      { id: "entry-1", externalAttribute: "decision", jsonPath: "decision", mappedField: "approval_status", dataType: "string", required: true, status: "Mapped" },
      { id: "entry-2", externalAttribute: "rate", jsonPath: "interest_rate", mappedField: "interest_rate", dataType: "number", required: false, status: "Mapped" },
      { id: "entry-3", externalAttribute: "tenure_years", jsonPath: "loan_tenure", mappedField: "loan_tenure", dataType: "number", required: false, status: "Mapped" },
      { id: "entry-4", externalAttribute: "risk_level", jsonPath: "risk_level", mappedField: "risk_classification", dataType: "string", required: false, status: "Mapped" },
    ],
    createdAt: PRODUCT_SEED_TIMESTAMP,
    updatedAt: PRODUCT_SEED_TIMESTAMP,
  },
  {
    id: "jm-prod-home-loan-demo-request",
    name: "Home Loan — Demo — Request Mapping",
    industry: "Lending",
    productId: "prod-home-loan-demo",
    direction: "request",
    entries: [
      { id: "e1", externalAttribute: "applicant_age", jsonPath: "applicant_age", mappedField: "applicant_age", dataType: "number", required: true, status: "Mapped" },
      { id: "e2", externalAttribute: "employment_type", jsonPath: "employment_type", mappedField: "employment_type", dataType: "enum", required: true, status: "Mapped" },
      { id: "e3", externalAttribute: "monthly_income", jsonPath: "monthly_income", mappedField: "monthly_income", dataType: "currency", required: true, status: "Mapped" },
      { id: "e4", externalAttribute: "credit_score", jsonPath: "credit_score", mappedField: "credit_score", dataType: "number", required: true, status: "Mapped" },
      { id: "e5", externalAttribute: "property_value", jsonPath: "property_value", mappedField: "property_value", dataType: "currency", required: true, status: "Mapped" },
      { id: "e6", externalAttribute: "loan_amount", jsonPath: "loan_amount", mappedField: "loan_amount", dataType: "currency", required: true, status: "Mapped" },
    ],
    createdAt: PRODUCT_SEED_TIMESTAMP,
    updatedAt: PRODUCT_SEED_TIMESTAMP,
  },
  {
    id: "jm-prod-home-loan-demo-response",
    name: "Home Loan — Demo — Response Mapping",
    industry: "Lending",
    productId: "prod-home-loan-demo",
    direction: "response",
    entries: [
      { id: "e1", externalAttribute: "decision", jsonPath: "decision", mappedField: "loan_decision", dataType: "string", required: true, status: "Mapped" },
      { id: "e2", externalAttribute: "approvedAmount", jsonPath: "approvedAmount", mappedField: "approved_amount", dataType: "number", required: false, status: "Mapped" },
      { id: "e3", externalAttribute: "interestRate", jsonPath: "interestRate", mappedField: "interest_rate", dataType: "number", required: false, status: "Mapped" },
    ],
    createdAt: PRODUCT_SEED_TIMESTAMP,
    updatedAt: PRODUCT_SEED_TIMESTAMP,
  },
];

// ============================================================
// USER ROSTER — individual named people. `role` is a free-text title, not a
// foreign key (deliberately independent of the `Role` capability-template
// list below). approvalCategories powers Maker-Checker: which Rule Category
// names (RuleCategory.name, from the configurable ruleCategories list) this
// person is authorized to approve. Seeded here with the business-reference
// mapping from the BRD, but it's plain configuration — the System
// Administrator can assign any category to any user via the checkboxes,
// nothing below is enforced in code.
//
// Mirrors the 6 personas from src/data/roles.json (name + capabilities) so
// User Management is a complete, self-contained roster — Roles itself is no
// longer surfaced as its own Configuration Studio page.
// ============================================================
const USER_SEED_TIMESTAMP = "2026-02-01T09:00:00.000Z";

export const DEFAULT_USERS: AppUser[] = [
  {
    id: "usr-kavita-rao",
    name: "Kavita Rao",
    email: "kavita.rao@example.com",
    role: "Credit/Risk Manager",
    department: "Credit Risk",
    status: "Active",
    permissions: ["rule.view", "rule.create", "rule.edit", "rule.simulate", "rule.publish"],
    approvalCategories: ["Eligibility", "Risk & Fraud"],
    createdAt: USER_SEED_TIMESTAMP,
    updatedAt: USER_SEED_TIMESTAMP,
  },
  {
    id: "usr-arjun-nair",
    name: "Arjun Nair",
    email: "arjun.nair@example.com",
    role: "Underwriter/Claims",
    department: "Underwriting & Claims",
    status: "Active",
    permissions: ["rule.view", "rule.create", "rule.edit", "rule.simulate", "rule.publish"],
    approvalCategories: ["Underwriting", "Claims", "Collateral"],
    createdAt: USER_SEED_TIMESTAMP,
    updatedAt: USER_SEED_TIMESTAMP,
  },
  {
    id: "usr-rohan-mehta",
    name: "Rohan Mehta",
    email: "rohan.mehta@example.com",
    role: "Product Manager",
    department: "Product Strategy",
    status: "Active",
    permissions: ["rule.view", "rule.create", "rule.edit", "rule.simulate", "rule.publish", "config.manage"],
    approvalCategories: ["Pricing"],
    createdAt: USER_SEED_TIMESTAMP,
    updatedAt: USER_SEED_TIMESTAMP,
  },
  {
    id: "usr-ananya-verma",
    name: "Ananya Verma",
    email: "ananya.verma@example.com",
    role: "Business Analyst",
    department: "Business Analysis",
    status: "Active",
    permissions: ["rule.view", "rule.create", "rule.edit", "rule.simulate"],
    approvalCategories: [],
    createdAt: USER_SEED_TIMESTAMP,
    updatedAt: USER_SEED_TIMESTAMP,
  },
  {
    id: "usr-divya-iyer",
    name: "Divya Iyer",
    email: "divya.iyer@example.com",
    role: "Operations",
    department: "Operations",
    status: "Active",
    permissions: ["rule.view", "rule.simulate"],
    approvalCategories: [],
    createdAt: USER_SEED_TIMESTAMP,
    updatedAt: USER_SEED_TIMESTAMP,
  },
  {
    id: "usr-vikram-chawla",
    name: "Vikram Chawla",
    email: "vikram.chawla@example.com",
    role: "System Administrator",
    department: "IT / System Administration",
    status: "Active",
    permissions: ["rule.view", "rule.create", "rule.edit", "rule.delete", "rule.simulate", "rule.publish", "system.manage", "config.manage"],
    approvalCategories: [],
    createdAt: USER_SEED_TIMESTAMP,
    updatedAt: USER_SEED_TIMESTAMP,
  },
];

// ============================================================
// RULE TEMPLATES — generic, industry-agnostic starting shapes. Instantiating
// one just pre-fills the Rule Builder; the result is a normal editable rule.
// ============================================================
export const DEFAULT_RULE_TEMPLATES: RuleTemplate[] = [
  // Domain-scoped examples — real field references, so they're usable
  // as-is (adjust the threshold/value) instead of just a bare shape.
  {
    id: "tmpl-lending-high-dti-reject",
    name: "High DTI Reject",
    description: "Decline lending applications whose debt-to-income ratio exceeds a safe threshold.",
    domain: "Lending",
    categoryId: "underwriting",
    rootGroup: group("AND", [cond("dti_ratio", ">", "50")]),
    actions: [{ id: cid(), type: "Reject", reasonCode: "DTI_EXCEEDED", message: "Debt-to-income ratio exceeds the acceptable limit." }],
  },
  {
    id: "tmpl-insurance-smoker-loading",
    name: "Smoker Premium Loading",
    description: "Apply an extra premium loading percentage when the applicant is a declared smoker.",
    domain: "Insurance",
    categoryId: "pricing",
    rootGroup: group("AND", [cond("smoker", "=", "true")]),
    actions: [{ id: cid(), type: "Assign Value", outputField: "premium_loading_pct", outputValue: "15", outputType: "number" }],
  },
  {
    id: "tmpl-nbfc-ltv-cap",
    name: "LTV Cap Check",
    description: "Reject gold/asset-backed loan requests whose requested LTV breaches the collateral policy cap.",
    domain: "NBFC",
    categoryId: "collateral",
    rootGroup: group("AND", [cond("ltv_requested", ">", "75")]),
    actions: [{ id: cid(), type: "Reject", reasonCode: "LTV_CAP_BREACH", message: "Requested LTV exceeds the collateral policy cap." }],
  },
  {
    id: "tmpl-lending-min-credit-score",
    name: "Minimum Credit Score Gate",
    description: "Decline lending applications whose bureau credit score falls below the policy floor.",
    domain: "Lending",
    categoryId: "eligibility",
    rootGroup: group("AND", [cond("credit_score", "<", "650")]),
    actions: [{ id: cid(), type: "Reject", reasonCode: "LOW_CREDIT_SCORE", message: "Bureau credit score is below the minimum acceptable threshold." }],
  },
  {
    id: "tmpl-lending-high-value-review",
    name: "High Loan Amount Escalation",
    description: "Flag unusually large loan requests for senior underwriter review before approval.",
    domain: "Lending",
    categoryId: "underwriting",
    rootGroup: group("AND", [cond("loan_amount", ">", "2000000")]),
    actions: [{ id: cid(), type: "Flag for Review", reasonCode: "HIGH_VALUE_REVIEW", message: "High loan amount requested — route to senior underwriter for review." }],
  },
  {
    id: "tmpl-insurance-min-sum-assured",
    name: "Minimum Sum Assured Gate",
    description: "Decline policy applications whose requested sum assured is below the minimum coverage.",
    domain: "Insurance",
    categoryId: "eligibility",
    rootGroup: group("AND", [cond("sum_assured", "<", "500000")]),
    actions: [{ id: cid(), type: "Reject", reasonCode: "INSUFFICIENT_COVERAGE", message: "Requested sum assured is below the minimum coverage amount." }],
  },
  {
    id: "tmpl-insurance-high-bmi-review",
    name: "High BMI Medical Review",
    description: "Flag applicants with an elevated BMI for a medical underwriting review.",
    domain: "Insurance",
    categoryId: "underwriting",
    rootGroup: group("AND", [cond("bmi", ">", "30")]),
    actions: [{ id: cid(), type: "Flag for Review", reasonCode: "HIGH_BMI_REVIEW", message: "Elevated BMI — refer application for medical review." }],
  },
  {
    id: "tmpl-nbfc-min-purity",
    name: "Minimum Purity Grade Check",
    description: "Reject gold-backed collateral whose purity grade falls below the policy floor.",
    domain: "NBFC",
    categoryId: "collateral",
    rootGroup: group("AND", [cond("purity_grade", "<", "18")]),
    actions: [{ id: cid(), type: "Reject", reasonCode: "LOW_PURITY", message: "Collateral purity grade is below the minimum acceptable threshold." }],
  },
  {
    id: "tmpl-nbfc-high-value-review",
    name: "High Appraised Value Review",
    description: "Flag unusually high-value collateral for manager review before approval.",
    domain: "NBFC",
    categoryId: "risk-fraud",
    rootGroup: group("AND", [cond("appraised_value", ">", "1000000")]),
    actions: [{ id: cid(), type: "Flag for Review", reasonCode: "HIGH_VALUE_COLLATERAL_REVIEW", message: "High-value collateral — route for manager review." }],
  },
  {
    id: "tmpl-creditcards-min-income",
    name: "Minimum Income Gate",
    description: "Decline card applications whose annual income is below the policy floor.",
    domain: "CreditCards",
    categoryId: "eligibility",
    rootGroup: group("AND", [cond("annual_income", "<", "300000")]),
    actions: [{ id: cid(), type: "Reject", reasonCode: "INSUFFICIENT_INCOME", message: "Annual income is below the minimum required for card issuance." }],
  },
  {
    id: "tmpl-creditcards-high-utilization-review",
    name: "High Utilization Review",
    description: "Flag applicants with high existing credit utilization before any limit increase.",
    domain: "CreditCards",
    categoryId: "risk-fraud",
    rootGroup: group("AND", [cond("credit_utilization_ratio", ">", "70")]),
    actions: [{ id: cid(), type: "Flag for Review", reasonCode: "HIGH_UTILIZATION_REVIEW", message: "High credit utilization — review before any limit increase." }],
  },
  {
    id: "tmpl-wealth-min-investment",
    name: "Minimum Investment Gate",
    description: "Decline onboarding when the proposed investment amount is below the plan's minimum.",
    domain: "Wealth",
    categoryId: "eligibility",
    rootGroup: group("AND", [cond("investment_amount", "<", "50000")]),
    actions: [{ id: cid(), type: "Reject", reasonCode: "BELOW_MIN_INVESTMENT", message: "Investment amount is below the minimum required for this plan." }],
  },
  {
    id: "tmpl-wealth-aggressive-review",
    name: "Aggressive Risk Advisory Review",
    description: "Flag applicants with an aggressive risk appetite for advisor review before onboarding.",
    domain: "Wealth",
    categoryId: "risk-fraud",
    rootGroup: group("AND", [cond("risk_appetite", "=", "Aggressive")]),
    actions: [{ id: cid(), type: "Flag for Review", reasonCode: "AGGRESSIVE_PROFILE_REVIEW", message: "Aggressive risk appetite — advisor review recommended." }],
  },
];

// ============================================================
// NOTIFYX — trigger -> condition -> action workflow automation (config-only
// prototype, no execution engine — runCount/logs are seed data, same as
// every other seeded rollup in this file). Categories/Triggers are
// configurable registries; see src/lib/notify-vocabulary.ts for the small
// fixed vocabularies (action types/operators/delays).
// ============================================================
let notifyStepCounter = 0;
const nsid = () => `NS-${(++notifyStepCounter).toString().padStart(4, "0")}`;

export const DEFAULT_NOTIFY_CATEGORIES: NotifyCategory[] = [
  { id: "cat-rule-governance", name: "Rule Governance", colorToken: "blue" },
  { id: "cat-product-lifecycle", name: "Product Lifecycle", colorToken: "emerald" },
  { id: "cat-simulation", name: "Simulation & Testing", colorToken: "violet" },
  { id: "cat-compliance", name: "Compliance & Audit", colorToken: "red" },
  { id: "cat-system-access", name: "System & Access", colorToken: "slate" },
];

export const DEFAULT_NOTIFY_TRIGGERS: NotifyTrigger[] = [
  { id: "trg-rule-submitted", label: "Rule Submitted for Review", categoryId: "cat-rule-governance" },
  { id: "trg-rule-approved", label: "Rule Approved & Published", categoryId: "cat-rule-governance" },
  { id: "trg-rule-sent-back", label: "Rule Sent Back to Draft", categoryId: "cat-rule-governance" },
  { id: "trg-product-published", label: "Product Published", categoryId: "cat-product-lifecycle" },
  { id: "trg-product-created", label: "Product Created", categoryId: "cat-product-lifecycle" },
  { id: "trg-sim-rejected", label: "Simulation Rejected Outcome", categoryId: "cat-simulation" },
  { id: "trg-sim-review", label: "Simulation Review-Required Outcome", categoryId: "cat-simulation" },
  { id: "trg-sandbox-run", label: "Sandbox Test Run", categoryId: "cat-simulation" },
  { id: "trg-audit-chain-failed", label: "Audit Chain Verification Failed", categoryId: "cat-compliance" },
  { id: "trg-rule-conflict", label: "Rule Conflict Detected", categoryId: "cat-compliance" },
  { id: "trg-role-created", label: "New Role Created", categoryId: "cat-system-access" },
];

function nlog(description: string, result: NotifyExecutionLog["result"], daysBack: number): NotifyExecutionLog {
  return { id: nsid(), timestamp: daysAgo(daysBack), description, result };
}

export const DEFAULT_NOTIFY_WORKFLOWS: NotifyWorkflow[] = [
  {
    id: "wf-rule-review-reminder",
    name: "Rule Review Reminder",
    categoryId: "cat-rule-governance",
    triggerId: "trg-rule-submitted",
    status: "Active",
    steps: [
      { id: nsid(), kind: "wait", duration: "24 hours" },
      { id: nsid(), kind: "condition", field: "Rule Status", operator: "is", value: "Testing" },
      { id: nsid(), kind: "action", actionType: "Notify Stakeholders", recipient: "Credit/Risk Manager", message: "This rule has been awaiting review for over 24 hours." },
    ],
    createdAt: daysAgo(90),
    updatedAt: daysAgo(2),
    createdBy: "Vikram Chawla",
    runCount: 14,
    logs: [
      nlog("Notified Credit/Risk Manager — RL-303 still in Testing after 24h", "Success", 0.6),
      nlog("Notified Credit/Risk Manager — RL-108 still in Testing after 24h", "Success", 5),
      nlog("Skipped — RL-206 approved before the 24h wait elapsed", "Skipped", 9),
    ],
  },
  {
    id: "wf-rule-rejection-escalation",
    name: "Rule Rejection Escalation",
    categoryId: "cat-rule-governance",
    triggerId: "trg-rule-sent-back",
    status: "Active",
    steps: [
      { id: nsid(), kind: "condition", field: "Priority", operator: "is", value: "1" },
      { id: nsid(), kind: "action", actionType: "Create Escalation", recipient: "System Administrator", message: "Critical-priority rule was sent back to Draft — needs attention." },
    ],
    createdAt: daysAgo(60),
    updatedAt: daysAgo(12),
    createdBy: "Rohan Mehta",
    runCount: 3,
    logs: [
      nlog("Escalated RL-109 rejection to System Administrator", "Success", 12),
      nlog("Escalated RL-303 rejection to System Administrator", "Success", 40),
    ],
  },
  {
    id: "wf-product-publish-broadcast",
    name: "Product Publish Broadcast",
    categoryId: "cat-product-lifecycle",
    triggerId: "trg-product-published",
    status: "Active",
    steps: [
      { id: nsid(), kind: "action", actionType: "Send Email", recipient: "All Stakeholders", message: "A product has just been published and is now live via the API." },
      { id: nsid(), kind: "action", actionType: "Send In-App Notification", recipient: "Product Manager", message: "Review the published product's API Information tab." },
    ],
    createdAt: daysAgo(75),
    updatedAt: daysAgo(1),
    createdBy: "Rohan Mehta",
    runCount: 22,
    logs: [
      nlog("Broadcast sent for Home Loan publish", "Success", 1),
      nlog("Broadcast sent for Term Life Cover publish", "Success", 20),
      nlog("Email delivery failed — distribution list unreachable", "Failed", 33),
    ],
  },
  {
    id: "wf-new-product-setup-reminder",
    name: "New Product Setup Reminder",
    categoryId: "cat-product-lifecycle",
    triggerId: "trg-product-created",
    status: "Draft",
    steps: [
      { id: nsid(), kind: "wait", duration: "3 days" },
      { id: nsid(), kind: "condition", field: "Mapped Rules", operator: "is", value: "0" },
      { id: nsid(), kind: "action", actionType: "Create Follow-up Task", recipient: "Product Manager", message: "This product still has no rules mapped 3 days after creation." },
    ],
    createdAt: daysAgo(10),
    updatedAt: daysAgo(10),
    createdBy: "Rohan Mehta",
    runCount: 0,
    logs: [],
  },
  {
    id: "wf-simulation-rejection-followup",
    name: "Simulation Rejection Follow-up",
    categoryId: "cat-simulation",
    triggerId: "trg-sim-rejected",
    status: "Paused",
    steps: [
      { id: nsid(), kind: "action", actionType: "Notify Stakeholders", recipient: "Underwriter/Claims", message: "A simulation returned a Rejected outcome for review." },
      { id: nsid(), kind: "wait", duration: "24 hours" },
      { id: nsid(), kind: "action", actionType: "Create Follow-up Task", recipient: "Underwriter/Claims", message: "Follow up on the rejected simulation if unactioned." },
    ],
    createdAt: daysAgo(45),
    updatedAt: daysAgo(15),
    createdBy: "Kavita Rao",
    runCount: 2,
    logs: [
      nlog("Notified Underwriter/Claims of Rejected outcome", "Success", 16),
      nlog("Notified Underwriter/Claims of Rejected outcome", "Success", 38),
    ],
  },
  {
    id: "wf-sandbox-test-digest",
    name: "Sandbox Test Digest",
    categoryId: "cat-simulation",
    triggerId: "trg-sandbox-run",
    status: "Draft",
    steps: [{ id: nsid(), kind: "action", actionType: "Send In-App Notification", recipient: "Business Analyst", message: "A sandbox test was run against a pending rule." }],
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
    createdBy: "Ananya Verma",
    runCount: 0,
    logs: [],
  },
  {
    id: "wf-compliance-audit-alert",
    name: "Compliance Audit Alert",
    categoryId: "cat-compliance",
    triggerId: "trg-audit-chain-failed",
    status: "Active",
    steps: [
      { id: nsid(), kind: "action", actionType: "Create Escalation", recipient: "System Administrator", message: "Audit chain integrity check failed — investigate immediately." },
      { id: nsid(), kind: "action", actionType: "Send Email", recipient: "System Administrator" },
    ],
    createdAt: daysAgo(70),
    updatedAt: daysAgo(25),
    createdBy: "Vikram Chawla",
    runCount: 3,
    logs: [
      nlog("Escalated audit chain verification failure", "Success", 25),
      nlog("Escalated audit chain verification failure", "Success", 55),
    ],
  },
  {
    id: "wf-new-role-provisioning-notice",
    name: "New Role Provisioning Notice",
    categoryId: "cat-system-access",
    triggerId: "trg-role-created",
    status: "Paused",
    steps: [{ id: nsid(), kind: "action", actionType: "Send In-App Notification", recipient: "All Stakeholders", message: "A new role has been provisioned in Configuration Studio." }],
    createdAt: daysAgo(30),
    updatedAt: daysAgo(18),
    createdBy: "Vikram Chawla",
    runCount: 2,
    logs: [
      nlog("Notified all stakeholders of new role \"Operations\"", "Success", 18),
      nlog("Notified all stakeholders of new role \"Underwriter/Claims\"", "Success", 28),
    ],
  },
];

export const DEFAULT_NOTIFY_WORKFLOW_TEMPLATES: NotifyWorkflowTemplate[] = [
  {
    id: "tmpl-notify-rule-approval-reminder",
    name: "Rule Approval Reminder",
    categoryId: "cat-rule-governance",
    triggerId: "trg-rule-submitted",
    steps: [
      { id: nsid(), kind: "wait", duration: "24 hours" },
      { id: nsid(), kind: "condition", field: "Rule Status", operator: "is", value: "Testing" },
      { id: nsid(), kind: "action", actionType: "Notify Stakeholders", recipient: "Credit/Risk Manager", message: "Reminder: this rule is still awaiting review." },
    ],
  },
  {
    id: "tmpl-notify-sla-breach-escalation",
    name: "SLA Breach Escalation",
    categoryId: "cat-compliance",
    triggerId: "trg-audit-chain-failed",
    steps: [
      { id: nsid(), kind: "action", actionType: "Notify Stakeholders", recipient: "System Administrator", message: "An SLA-relevant compliance event occurred." },
      { id: nsid(), kind: "wait", duration: "24 hours before SLA breach" },
      { id: nsid(), kind: "action", actionType: "Create Escalation", recipient: "System Administrator", message: "SLA is about to breach — escalating." },
    ],
  },
  {
    id: "tmpl-notify-product-publish-broadcast",
    name: "Product Publish Broadcast",
    categoryId: "cat-product-lifecycle",
    triggerId: "trg-product-published",
    steps: [
      { id: nsid(), kind: "action", actionType: "Send Email", recipient: "All Stakeholders", message: "A product has just been published." },
      { id: nsid(), kind: "action", actionType: "Send In-App Notification", recipient: "Product Manager" },
    ],
  },
  {
    id: "tmpl-notify-simulation-failure-followup",
    name: "Simulation Failure Follow-up",
    categoryId: "cat-simulation",
    triggerId: "trg-sim-rejected",
    steps: [
      { id: nsid(), kind: "action", actionType: "Notify Stakeholders", recipient: "Underwriter/Claims", message: "A simulation returned a Rejected outcome." },
      { id: nsid(), kind: "wait", duration: "24 hours" },
      { id: nsid(), kind: "action", actionType: "Create Follow-up Task", recipient: "Underwriter/Claims", message: "Follow up if this case is still unresolved." },
    ],
  },
];
