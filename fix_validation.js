
const fs = require("fs");
let code = fs.readFileSync("src/app/rule-builder/page.tsx", "utf8");

code = code.replace(
  "if ((a.type === \"Assign Value\" || a.type === \"Calculate\") && a.outputField) {",
  "const outKey = a.outputTarget === \"RUNTIME_VARIABLE\" ? a.outputVariable : a.outputField;\n      if ((a.type === \"Assign Value\" || a.type === \"Calculate\") && outKey) {\n        if (seen.has(outKey)) return outKey;\n        seen.add(outKey);\n      }"
);

// We need to also clean up the old `if (seen.has(a.outputField))` inside that block since we completely replaced the if statement body in the replacement string above.
// Wait, the above replacement replaces the `if` condition, leaving the old body. That is wrong. Let us do a cleaner replace.

code = fs.readFileSync("src/app/rule-builder/page.tsx", "utf8");

const oldDup = `function findDuplicateVariableName(actions: RuleAction[]): string | null {
  const seen = new Set<string>();
  for (const a of actions) {
    if ((a.type === "Assign Value" || a.type === "Calculate") && a.outputField) {
      if (seen.has(a.outputField)) return a.outputField;
      seen.add(a.outputField);
    }
  }
  return null;
}`;

const newDup = `function findDuplicateVariableName(actions: RuleAction[]): string | null {
  const seen = new Set<string>();
  for (const a of actions) {
    if (a.type === "Assign Value" || a.type === "Calculate") {
      const outKey = a.outputTarget === "RUNTIME_VARIABLE" ? a.outputVariable : a.outputField;
      if (outKey) {
        if (seen.has(outKey)) return outKey;
        seen.add(outKey);
      }
    }
  }
  return null;
}`;

code = code.replace(oldDup, newDup);

const oldCaseElse = `const missingOutput = caseElseActions.find((a) => (a.type === "Calculate" || a.type === "Assign Value") && !a.outputField);
        if (missingOutput) errs.caseElse = "CASE ELSE: a Calculate/Assign Value action needs an Output Field.";`;

const newCaseElse = `const missingOutput = caseElseActions.find((a) => (a.type === "Calculate" || a.type === "Assign Value") && !(a.outputTarget === "RUNTIME_VARIABLE" ? a.outputVariable : a.outputField));
        if (missingOutput) errs.caseElse = "CASE ELSE: a Calculate/Assign Value action needs an Output Field/Variable.";`;

code = code.replace(oldCaseElse, newCaseElse);

const oldOutput = `const missingOutput = list.find((a) => (a.type === "Calculate" || a.type === "Assign Value") && !a.outputField);
        if (missingOutput) errs.outputField = \`\${label}: a Calculate/Assign Value action needs an Output Field.\`;`;

const newOutput = `const missingOutput = list.find((a) => (a.type === "Calculate" || a.type === "Assign Value") && !(a.outputTarget === "RUNTIME_VARIABLE" ? a.outputVariable : a.outputField));
        if (missingOutput) errs.outputField = \`\${label}: a Calculate/Assign Value action needs an Output Field/Variable.\`;`;

code = code.replace(oldOutput, newOutput);

fs.writeFileSync("src/app/rule-builder/page.tsx", code, "utf8");
console.log("Done");

