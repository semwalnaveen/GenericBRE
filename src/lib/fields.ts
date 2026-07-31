import { BusinessField, Domain, Operator, RuleCategory } from "./types";

// Seed content only — the live catalog lives in the store (`fieldCatalog`) and
// is fully editable from the Configuration Studio. New industries add their
// own fields there; nothing here is a closed set.
export const DEFAULT_FIELD_CATALOG: BusinessField[] = [
  // Common
  { key: "applicant_age", label: "Applicant Age", domain: "Common", type: "number", unit: "years", entity: "applicant", mandatory: true },
  { key: "gender", label: "Gender", domain: "Common", type: "enum", options: ["Male", "Female", "Other"], entity: "applicant" },
  { key: "city", label: "Current City", domain: "Common", type: "enum", options: ["Mumbai", "Delhi", "Bengaluru", "Chennai", "Pune", "Ahmedabad", "Other"], entity: "applicant" },
  { key: "segment", label: "Segment Tier", domain: "Common", type: "enum", options: ["Mass", "Affluent", "Premium"], entity: "applicant" },

  // Lending
  { key: "credit_score", label: "Bureau Credit Score", domain: "Lending", type: "number", entity: "applicant", mask: true },
  { key: "monthly_income", label: "Monthly Income", domain: "Lending", type: "currency", unit: "₹", entity: "applicant", mandatory: true, mask: true },
  { key: "monthly_liabilities", label: "Monthly Liabilities", domain: "Lending", type: "currency", unit: "₹", entity: "applicant", mask: true },
  { key: "loan_amount", label: "Loan Amount Requested", domain: "Lending", type: "currency", unit: "₹", entity: "loan-account" },
  { key: "loan_type", label: "Loan Type", domain: "Lending", type: "enum", options: ["Personal Loan", "Home Loan", "Vehicle Loan", "Business Loan"], entity: "loan-account" },
  { key: "dti_ratio", label: "Debt-to-Income Ratio", domain: "Lending", type: "number", unit: "%", computed: true, entity: "applicant" },
  { key: "employment_type", label: "Employment Type", domain: "Lending", type: "enum", options: ["Salaried", "Self-Employed", "Business Owner", "Government"], entity: "applicant" },
  { key: "ltv_ratio", label: "LTV Ratio", domain: "Lending", type: "number", unit: "%", computed: true, entity: "loan-account" },
  { key: "eligible_loan_amount", label: "Eligible Loan Amount", domain: "Lending", type: "number", unit: "₹", computed: true, entity: "loan-account" },
  { key: "currency", label: "Currency", domain: "Lending", type: "string", computed: true, entity: "loan-account" },
  { key: "property_value", label: "Property Value", domain: "Lending", type: "currency", unit: "₹", entity: "loan-account" },
  { key: "interest_rate", label: "Interest Rate", domain: "Lending", type: "number", unit: "%", computed: true, entity: "loan-account" },
  { key: "applicant_eligible", label: "Applicant Eligible", domain: "Lending", type: "boolean", computed: true, entity: "applicant" },
  { key: "income_eligible", label: "Income Eligible", domain: "Lending", type: "boolean", computed: true, entity: "applicant" },
  { key: "loan_decision", label: "Loan Decision", domain: "Lending", type: "string", computed: true, entity: "loan-account" },
  { key: "approved_amount", label: "Approved Amount", domain: "Lending", type: "currency", unit: "₹", computed: true, entity: "loan-account" },

  // Insurance
  { key: "smoker", label: "Smoker Status", domain: "Insurance", type: "boolean", entity: "policy" },
  { key: "occupation_type", label: "Occupation Risk Tier", domain: "Insurance", type: "enum", options: ["Low Risk", "Medium Risk", "High Risk"], entity: "policy" },
  { key: "bmi", label: "BMI Metric", domain: "Insurance", type: "number", entity: "policy" },
  { key: "sum_assured", label: "Sum Assured Capital", domain: "Insurance", type: "currency", unit: "₹", entity: "policy" },
  { key: "base_premium", label: "Base Premium", domain: "Insurance", type: "currency", unit: "₹", entity: "policy" },
  { key: "medical_history", label: "Medical History Flag", domain: "Insurance", type: "boolean", entity: "policy" },

  // NBFC / Gold Loan
  { key: "collateral_type", label: "Collateral Asset Type", domain: "NBFC", type: "enum", options: ["Gold", "Vehicle", "Property", "Securities"], entity: "collateral" },
  { key: "appraised_value", label: "Appraised Asset Value", domain: "NBFC", type: "currency", unit: "₹", entity: "collateral" },
  { key: "purity_grade", label: "Purity / Grade %", domain: "NBFC", type: "number", unit: "%", entity: "collateral" },
  { key: "ltv_requested", label: "LTV Requested", domain: "NBFC", type: "number", unit: "%", entity: "collateral" },

  // Credit Cards
  { key: "annual_income", label: "Annual Income", domain: "CreditCards", type: "currency", unit: "₹", entity: "applicant" },
  { key: "requested_credit_limit", label: "Requested Credit Limit", domain: "CreditCards", type: "currency", unit: "₹", entity: "credit-card-account" },
  { key: "credit_utilization_ratio", label: "Credit Utilization Ratio", domain: "CreditCards", type: "number", unit: "%", entity: "credit-card-account" },
  { key: "existing_cards_count", label: "Existing Cards Held", domain: "CreditCards", type: "number", entity: "applicant" },
  { key: "card_type_requested", label: "Card Type Requested", domain: "CreditCards", type: "enum", options: ["Standard", "Gold", "Platinum", "Signature"], entity: "credit-card-account" },
  { key: "late_payment_history", label: "Late Payment History", domain: "CreditCards", type: "boolean", entity: "applicant" },

  // Wealth Management
  { key: "investment_amount", label: "Investment Amount", domain: "Wealth", type: "currency", unit: "₹", entity: "investment-account" },
  { key: "risk_appetite", label: "Risk Appetite", domain: "Wealth", type: "enum", options: ["Conservative", "Moderate", "Aggressive"], entity: "applicant" },
  { key: "portfolio_type", label: "Portfolio Type", domain: "Wealth", type: "enum", options: ["Equity", "Debt", "Hybrid", "Balanced"], entity: "investment-account" },
  { key: "kyc_verified", label: "KYC Verified", domain: "Wealth", type: "boolean", entity: "applicant" },
  { key: "net_worth", label: "Net Worth", domain: "Wealth", type: "currency", unit: "₹", entity: "applicant" },
  { key: "investment_horizon_years", label: "Investment Horizon", domain: "Wealth", type: "number", unit: "years", entity: "investment-account" },
];

export const OPERATORS: { value: Operator; label: string; types: string[] }[] = [
  { value: "=", label: "Equal to", types: ["number", "string", "boolean", "enum", "currency"] },
  { value: "!=", label: "Not equal to", types: ["number", "string", "boolean", "enum", "currency"] },
  { value: ">", label: "Greater than", types: ["number", "currency"] },
  { value: "<", label: "Less than", types: ["number", "currency"] },
  { value: ">=", label: "Greater or equal", types: ["number", "currency"] },
  { value: "<=", label: "Less or equal", types: ["number", "currency"] },
  { value: "contains", label: "Contains", types: ["string"] },
  { value: "starts_with", label: "Starts with", types: ["string"] },
  { value: "in", label: "In (list)", types: ["enum", "string"] },
  { value: "between", label: "Between", types: ["number", "currency", "date"] },
];

export function fieldsForDomain(catalog: BusinessField[], domain: Domain): BusinessField[] {
  return catalog.filter((f) => f.domain === domain || f.domain === "Common");
}

export function getField(catalog: BusinessField[], key: string): BusinessField | undefined {
  return catalog.find((f) => f.key === key);
}

// Seed content only — the live list lives in the store (`ruleCategories`) and
// is fully editable from the Configuration Studio.
const DEFAULT_CATEGORY_NAMES = [
  "Eligibility",
  "Pricing",
  "Underwriting",
  "Risk & Fraud",
  "Compliance",
  "Collateral",
  "Claims",
];

export const DEFAULT_RULE_CATEGORIES: RuleCategory[] = DEFAULT_CATEGORY_NAMES.map((name) => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  name,
}));

// Seed content only — the live list lives in the store (`owners`) and is fully
// editable from the Configuration Studio.
export const DEFAULT_OWNERS = [
  "Credit Risk Division",
  "Actuarial Underwriting",
  "Asset Management Group",
  "Claims Governance Board",
  "Product Strategy Team",
  "Compliance Office",
];
