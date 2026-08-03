
const fs = require("fs");
let code = fs.readFileSync("src/lib/engine.ts", "utf8");

code = code.replace(
  "import { resolveActionValue, resolveBracketValue } from \"./formulas\";",
  "import { resolveActionValue, resolveBracketValue } from \"./formulas\";\nimport { topologicalSortRules } from \"./topological-sort\";"
);

code = code.replace(
  "const domainRules = rules\n      .filter((r) => r.domain === domain && r.simulatable)\n      .sort((a, b) => sortDirection * (a.priority - b.priority));\n\n    const core = runRulesForCase(domainRules, input, catalog, sandboxRuleIds, executionSettings, true);",
  "const sortedByPriority = rules\n      .filter((r) => r.domain === domain && r.simulatable)\n      .sort((a, b) => sortDirection * (a.priority - b.priority));\n    const domainRules = topologicalSortRules(sortedByPriority);\n\n    const core = runRulesForCase(domainRules, input, catalog, sandboxRuleIds, executionSettings, true);"
);

fs.writeFileSync("src/lib/engine.ts", code, "utf8");
console.log("Updated engine.ts");

