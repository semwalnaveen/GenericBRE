
const fs = require("fs");
let code = fs.readFileSync("src/components/rule-builder/condition-editor.tsx", "utf8");

const oldValidation = `      : isNumeric && Number.isNaN(Number(condition.value))
        ? "Value must be a number"
        : condition.operator === "between" && (!condition.value2 || condition.value2 === "")
          ? 'Enter both values for "Between"'
          : condition.operator === "between" && isNumeric && Number.isNaN(Number(condition.value2))
            ? "Second value must be a number"`;

const newValidation = `      : isNumeric && condition.rhsType !== "FIELD_REFERENCE" && Number.isNaN(Number(condition.value))
        ? "Value must be a number"
        : condition.operator === "between" && (!condition.value2 || condition.value2 === "")
          ? 'Enter both values for "Between"'
          : condition.operator === "between" && isNumeric && condition.rhsType !== "FIELD_REFERENCE" && Number.isNaN(Number(condition.value2))
            ? "Second value must be a number"`;

code = code.replace(oldValidation, newValidation);
fs.writeFileSync("src/components/rule-builder/condition-editor.tsx", code, "utf8");

