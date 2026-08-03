
const fs = require("fs");
let code = fs.readFileSync("src/lib/store.ts", "utf8");

if (!code.includes("collectRuleDependencies")) {
  code = code.replace(
    "import { ConditionGroup, effectiveConnector } from \"./condition-tree\";",
    "import { ConditionGroup, effectiveConnector, collectRuleDependencies } from \"./condition-tree\";"
  );
}

// Fix ruleIds redeclaration
code = code.replace(
  "const ruleIds = [...new Set(ruleIdsInput)];\\n        for (const rid of ruleIds) {",
  "const depsRuleIds = [...new Set(ruleIdsInput)];\\n        for (const rid of depsRuleIds) {"
);
code = code.replace(
  "if (depId !== rid && !ruleIds.includes(depId)) {",
  "if (depId !== rid && !depsRuleIds.includes(depId)) {"
);

fs.writeFileSync("src/lib/store.ts", code, "utf8");
console.log("Fixed store.ts errors");

