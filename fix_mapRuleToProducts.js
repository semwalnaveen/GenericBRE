
const fs = require("fs");
let code = fs.readFileSync("src/lib/store.ts", "utf8");

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
console.log("Updated mapRuleToProducts.");

