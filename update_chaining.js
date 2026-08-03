
const fs = require("fs");
let code = fs.readFileSync("src/lib/rule-chaining.ts", "utf8");

code = code.replace(
  "if ((action.type === \"Assign Value\" || action.type === \"Calculate\" || action.type === \"Bracket Lookup\") && action.outputField && !seen.has(action.outputField)) {",
  "const outKey = action.outputTarget === \"RUNTIME_VARIABLE\" ? action.outputVariable : action.outputField;\n        if ((action.type === \"Assign Value\" || action.type === \"Calculate\" || action.type === \"Bracket Lookup\") && outKey && !seen.has(outKey)) {"
);

code = code.replace(
  "seen.add(action.outputField);\n          variables.push({ key: action.outputField, sourceRuleId: r.id, sourceRuleName: r.name });",
  "seen.add(outKey);\n          variables.push({ key: outKey, sourceRuleId: r.id, sourceRuleName: r.name });"
);

fs.writeFileSync("src/lib/rule-chaining.ts", code, "utf8");
console.log("Done");

