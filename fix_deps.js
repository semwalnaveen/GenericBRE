
const fs = require("fs");
let code = fs.readFileSync("src/lib/condition-tree.ts", "utf8");

const replacement = `export function collectRuleDependencies(node: ConditionGroup, out = new Set<string>()): Set<string> {
  for (const c of node.children) {
    if (c.type === "group") {
      collectRuleDependencies(c, out);
    } else if (c.type === "condition") {
      if (c.sourceType === "RULE_OUTPUT" && c.sourceRuleId) out.add(c.sourceRuleId);
      if (c.rhsSourceType === "RULE_OUTPUT" && c.rhsSourceRuleId) out.add(c.rhsSourceRuleId);
    }
  }
  return out;
}

export function collectRuleDependencyDetails(node: ConditionGroup, out: { ruleId: string; field: string }[] = []): { ruleId: string; field: string }[] {
  for (const c of node.children) {
    if (c.type === "group") {
      collectRuleDependencyDetails(c, out);
    } else if (c.type === "condition") {
      if (c.sourceType === "RULE_OUTPUT" && c.sourceRuleId) {
        out.push({ ruleId: c.sourceRuleId, field: c.field });
      }
      if (c.rhsSourceType === "RULE_OUTPUT" && c.rhsSourceRuleId) {
        out.push({ ruleId: c.rhsSourceRuleId, field: c.value });
      }
    }
  }
  return out;
}`;

code = code.replace(/export function collectRuleDependencies\([\s\S]*?return out;\n}/, replacement);
fs.writeFileSync("src/lib/condition-tree.ts", code, "utf8");
console.log("Done condition-tree");

