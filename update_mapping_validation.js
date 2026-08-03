
const fs = require("fs");
let code = fs.readFileSync("src/lib/store.ts", "utf8");

// 1. Import collectRuleDependencies
if (!code.includes("collectRuleDependencies")) {
  code = code.replace(
    "import { ConditionGroup, effectiveConnector } from \"./condition-tree\";",
    "import { ConditionGroup, effectiveConnector, collectRuleDependencies } from \"./condition-tree\";"
  );
}

// 2. Modify saveProductRuleMapping signature
code = code.replace(
  "saveProductRuleMapping: (productId: string, ruleIds: string[]) => void;",
  "saveProductRuleMapping: (productId: string, ruleIds: string[]) => { ok: boolean; reason?: string };"
);

// 3. Modify saveProductRuleMapping implementation
const oldSaveProduct = `saveProductRuleMapping: (productId, ruleIdsInput) => {
          const { currentUser } = get();
          if (!can(get(), "config.manage")) return;`;
const newSaveProduct = `saveProductRuleMapping: (productId, ruleIdsInput) => {
          const { currentUser, rules } = get();
          if (!can(get(), "config.manage")) return { ok: false, reason: "No permission" };
          
          // --- PIPELINE VALIDATION ---
          const ruleIds = [...new Set(ruleIdsInput)];
          for (const rid of ruleIds) {
            const rule = rules.find((r) => r.id === rid);
            if (rule) {
              for (const depId of collectRuleDependencies(rule.rootGroup)) {
                if (depId !== rid && !ruleIds.includes(depId)) {
                  const depRule = rules.find((r) => r.id === depId);
                  return { ok: false, reason: \`Cannot add "\${rule.name}" because it depends on "\${depRule?.name || depId}", which is missing from this product.\` };
                }
              }
            }
          }
          // ---------------------------
`;
code = code.replace(oldSaveProduct, newSaveProduct);

// 4. Modify mapRuleToProducts implementation
const oldMapRule = `mapRuleToProducts: (ruleId, config) => {
          const rule = get().rules.find((r) => r.id === ruleId);
          if (!rule) return { ok: false, reason: "Rule not found." };`;

const newMapRule = `mapRuleToProducts: (ruleId, config) => {
          const { rules, productRuleMappings } = get();
          const rule = rules.find((r) => r.id === ruleId);
          if (!rule) return { ok: false, reason: "Rule not found." };
          
          // --- PIPELINE VALIDATION ---
          const deps = new Set([...collectRuleDependencies(rule.rootGroup)].filter(id => id !== ruleId));
          if (deps.size > 0) {
            for (const productId of config.productIds) {
              const mappedToProduct = new Set(productRuleMappings.filter(m => m.productId === productId).map(m => m.ruleId));
              for (const depId of deps) {
                if (!mappedToProduct.has(depId)) {
                  const depRule = rules.find((r) => r.id === depId);
                  return { ok: false, reason: \`Cannot map "\${rule.name}" to this product because it depends on "\${depRule?.name || depId}", which is missing from the product.\` };
                }
              }
            }
          }
          // ---------------------------
`;
code = code.replace(oldMapRule, newMapRule);

fs.writeFileSync("src/lib/store.ts", code, "utf8");
console.log("Updated store.ts with pipeline validation.");

