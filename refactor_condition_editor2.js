
const fs = require("fs");
let code = fs.readFileSync("src/components/rule-builder/condition-editor.tsx", "utf8");

const selectFieldBlock = `const selectField = (key: string, sourceType?: "BUSINESS_FIELD" | "RULE_OUTPUT", sourceRuleId?: string) => {
    recordRecentField(key);
    onChange({ field: key, value: "", value2: undefined, sourceType, sourceRuleId });
    setFieldPickerOpen(false);
  };`;

const rhsSelectFieldBlock = `const selectField = (key: string, sourceType?: "BUSINESS_FIELD" | "RULE_OUTPUT", sourceRuleId?: string) => {
    recordRecentField(key);
    onChange({ field: key, value: "", value2: undefined, sourceType, sourceRuleId });
    setFieldPickerOpen(false);
  };
  const selectRhsField = (key: string, sourceType?: "BUSINESS_FIELD" | "RULE_OUTPUT", sourceRuleId?: string) => {
    recordRecentField(key);
    onChange({ value: key, value2: undefined, rhsType: "FIELD_REFERENCE", rhsSourceType: sourceType, rhsSourceRuleId: sourceRuleId });
    setRhsFieldPickerOpen(false);
  };`;
code = code.replace(selectFieldBlock, rhsSelectFieldBlock);

fs.writeFileSync("src/components/rule-builder/condition-editor.tsx", code, "utf8");
console.log("Refactored condition-editor.tsx pt 2");

