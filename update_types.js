
const fs = require("fs");
let code = fs.readFileSync("src/lib/types.ts", "utf8");

code = code.replace(
  "export interface RuleAction {\n  id: string;\n  type: ActionType;\n  outputField?: string;\n  outputValue?: string;",
  "export interface RuleAction {\n  id: string;\n  type: ActionType;\n  outputTarget?: \"BUSINESS_FIELD\" | \"RUNTIME_VARIABLE\";\n  outputField?: string;\n  outputVariable?: string;\n  outputValue?: string;"
);

// Fallback regex replacement if the specific string matching fails due to line endings
code = code.replace(/export interface RuleAction \{[\s\S]*?outputField\?: string;/m, (match) => {
    if (match.includes("outputTarget")) return match; // already applied
    return match.replace("outputField?: string;", "outputTarget?: \"BUSINESS_FIELD\" | \"RUNTIME_VARIABLE\";\n  outputField?: string;\n  outputVariable?: string;");
});

fs.writeFileSync("src/lib/types.ts", code, "utf8");
console.log("Done");

