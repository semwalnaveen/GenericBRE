
const fs = require("fs");
let code = fs.readFileSync("src/components/rule-builder/condition-editor.tsx", "utf8");
code = code.replace(`  const selectField = (key: string, sourceType?: "BUSINESS_FIELD" | "RULE_OUTPUT", sourceRuleId?: string) => {
    recordRecentField(key);
    onChange({ field: key, value: "", value2: undefined, sourceType, sourceRuleId });
    setFieldPickerOpen(false);
  };`, `  const selectField = (key: string, sourceType?: "BUSINESS_FIELD" | "RULE_OUTPUT", sourceRuleId?: string) => {
    recordRecentField(key);
    onChange({ field: key, value: "", value2: undefined, sourceType, sourceRuleId });
    setFieldPickerOpen(false);
  };
  const selectRhsField = (key: string, sourceType?: "BUSINESS_FIELD" | "RULE_OUTPUT", sourceRuleId?: string) => {
    recordRecentField(key);
    onChange({ value: key, value2: undefined, rhsType: "FIELD_REFERENCE", rhsSourceType: sourceType, rhsSourceRuleId: sourceRuleId });
    setRhsFieldPickerOpen(false);
  };`);
fs.writeFileSync("src/components/rule-builder/condition-editor.tsx", code, "utf8");

