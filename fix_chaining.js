
const fs = require("fs");
let code = fs.readFileSync("src/lib/rule-chaining.ts", "utf8");

code = code.replace(
  "seen.add(outKey);\n          variables.push({ key: outKey, sourceRuleId: r.id, sourceRuleName: r.name });",
  "seen.add(outKey!);\n          variables.push({ key: outKey!, sourceRuleId: r.id, sourceRuleName: r.name });"
);

fs.writeFileSync("src/lib/rule-chaining.ts", code, "utf8");
console.log("Done");

