import { BusinessField, LoanApplication, Product } from "./types";
import { getField } from "./fields";

// Normalizes a user-entered Application ID for matching — trims and upper-cases
// so "app000124" / " APP000124 " both resolve. IDs are compared case-insensitively.
export function normalizeApplicationId(raw: string): string {
  return raw.trim().toUpperCase();
}

// Client-side application lookup (this prototype has no backend — see
// LoanApplication in types.ts). Returns the matching application or undefined.
export function findApplication(applications: LoanApplication[], rawId: string): LoanApplication | undefined {
  const id = normalizeApplicationId(rawId);
  if (!id) return undefined;
  return applications.find((a) => a.id.toUpperCase() === id);
}

// The reason an application can't be simulated, resolved in one place so the
// Application-ID view can show a single clear inline message (spec step 13).
export type ApplicationResolutionError =
  | { kind: "not-found"; message: string }
  | { kind: "product-missing"; message: string }
  | { kind: "product-inactive"; message: string }
  | { kind: "no-mapped-rules"; message: string }
  | { kind: "no-fields"; message: string };

export interface ResolvedApplication {
  application: LoanApplication;
  product: Product;
}

// Resolves an application to its product and validates it's simulatable.
// `mappedRuleCount` is passed in (computed by the caller via getMappedRules)
// to avoid a circular import with product-rule-engine.
export function resolveApplication(
  application: LoanApplication | undefined,
  products: Product[],
  mappedRuleCount: (productId: string) => number
): ResolvedApplication | ApplicationResolutionError {
  if (!application) {
    return { kind: "not-found", message: "No application found with that ID. Check the ID and try again." };
  }
  const product = products.find((p) => p.id === application.productId);
  if (!product) {
    return { kind: "product-missing", message: `This application references a product that no longer exists (${application.productId}).` };
  }
  if (product.status !== "Active") {
    return { kind: "product-inactive", message: `"${product.name}" is currently Inactive — activate it in Product Master to simulate this application.` };
  }
  if (mappedRuleCount(product.id) === 0) {
    return { kind: "no-mapped-rules", message: `"${product.name}" has no rules mapped to it yet — nothing to evaluate.` };
  }
  if (Object.keys(application.fields).length === 0) {
    return { kind: "no-fields", message: "This application has no applicant data to evaluate." };
  }
  return { application, product };
}

export function isResolutionError(r: ResolvedApplication | ApplicationResolutionError): r is ApplicationResolutionError {
  return "kind" in r;
}

// A grouped, display-ready view of an application's fields for the read-only
// Applicant Details form (spec step 5). Groups by the Field Catalog's `entity`
// so the layout is catalog-driven, never hardcoded per product/domain.
export interface ApplicationFieldRow {
  key: string;
  label: string;
  value: string | number | boolean;
  unit?: string;
  isEnum: boolean;
}

export interface ApplicationFieldSection {
  entity: string;
  title: string;
  rows: ApplicationFieldRow[];
}

// Human title for a Field Catalog entity id (e.g. "loan-account" -> "Loan Details").
const ENTITY_TITLES: Record<string, string> = {
  applicant: "Applicant Details",
  "loan-account": "Loan Details",
  collateral: "Collateral & Asset",
  policy: "Policy Details",
  "credit-card-account": "Card Details",
  "investment-account": "Investment Details",
};

function titleForEntity(entity: string | undefined): string {
  if (!entity) return "Other Details";
  return ENTITY_TITLES[entity] ?? entity.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function groupApplicationFields(
  application: LoanApplication,
  fieldCatalog: BusinessField[]
): ApplicationFieldSection[] {
  const byEntity = new Map<string, ApplicationFieldRow[]>();
  for (const [key, value] of Object.entries(application.fields)) {
    const field = getField(fieldCatalog, key);
    const entity = field?.entity ?? "other";
    const row: ApplicationFieldRow = {
      key,
      label: field?.label ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      value,
      unit: field?.unit,
      isEnum: field?.type === "enum",
    };
    const rows = byEntity.get(entity) ?? [];
    rows.push(row);
    byEntity.set(entity, rows);
  }
  return Array.from(byEntity.entries()).map(([entity, rows]) => ({
    entity,
    title: titleForEntity(entity === "other" ? undefined : entity),
    rows,
  }));
}
