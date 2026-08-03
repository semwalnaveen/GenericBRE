
const fs = require("fs");
let code = fs.readFileSync("src/components/rule-builder/condition-editor.tsx", "utf8");

const replacement = `  const selectField = (key: string, sourceType?: "BUSINESS_FIELD" | "RULE_OUTPUT", sourceRuleId?: string) => {
    recordRecentField(key);
    onChange({ field: key, value: "", value2: undefined, sourceType, sourceRuleId });
    setFieldPickerOpen(false);
  };

  const selectRhsField = (key: string, rhsSourceType?: "BUSINESS_FIELD" | "RULE_OUTPUT", rhsSourceRuleId?: string) => {
    onChange({ value: key, rhsSourceType, rhsSourceRuleId } as any);
    setRhsFieldPickerOpen(false);
  };`;

code = code.replace(/  const selectField = \([^\{]+\{[\s\S]*?setFieldPickerOpen\(false\);\r?\n  };/, replacement);
fs.writeFileSync("src/components/rule-builder/condition-editor.tsx", code, "utf8");

