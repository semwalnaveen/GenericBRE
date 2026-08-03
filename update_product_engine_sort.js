
const fs = require("fs");
let code = fs.readFileSync("src/lib/product-rule-engine.ts", "utf8");

code = code.replace(
  "import { DEFAULT_EXECUTION_SETTINGS, InputMap, runRulesForCase } from \"./engine\";",
  "import { DEFAULT_EXECUTION_SETTINGS, InputMap, runRulesForCase } from \"./engine\";\nimport { topologicalSortRules } from \"./topological-sort\";"
);

code = code.replace(
  "      return a.priority - b.priority;\n    });\n}",
  "      return a.priority - b.priority;\n    });\n\n  return topologicalSortRules(sortedByPriority);\n}"
);

// Wait, the above replacement replaces the end of `getMappedRules`. 
// Let us replace exactly the `return allRules.filter...sort...` block.

code = fs.readFileSync("src/lib/product-rule-engine.ts", "utf8");

const oldBlock = `  return allRules
    .filter((r) => {
      if (!ruleIds.has(r.id) || seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    })
    .sort((a, b) => {
      const oa = orderByRuleId.get(a.id);
      const ob = orderByRuleId.get(b.id);
      if (oa !== undefined && ob !== undefined) return oa - ob;
      if (oa !== undefined) return -1;
      if (ob !== undefined) return 1;
      return a.priority - b.priority;
    });`;

const newBlock = `  const sortedByPriority = allRules
    .filter((r) => {
      if (!ruleIds.has(r.id) || seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    })
    .sort((a, b) => {
      const oa = orderByRuleId.get(a.id);
      const ob = orderByRuleId.get(b.id);
      if (oa !== undefined && ob !== undefined) return oa - ob;
      if (oa !== undefined) return -1;
      if (ob !== undefined) return 1;
      return a.priority - b.priority;
    });

  return topologicalSortRules(sortedByPriority);`;

code = code.replace(oldBlock, newBlock);

fs.writeFileSync("src/lib/product-rule-engine.ts", code, "utf8");
console.log("Updated product-rule-engine.ts");

