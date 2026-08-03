
const fs = require("fs");
let code = fs.readFileSync("src/components/rule-builder/condition-editor.tsx", "utf8");

const t1 = `  const isNumeric = field?.type === "number" || field?.type === "currency";`;

const t2 = `      : isNumeric && Number.isNaN(Number(condition.value))`;
const r2 = `      : isNumeric && condition.rhsType !== "FIELD_REFERENCE" && Number.isNaN(Number(condition.value))`;

const t3 = `          : condition.operator === "between" && isNumeric && Number.isNaN(Number(condition.value2))`;
const r3 = `          : condition.operator === "between" && isNumeric && condition.rhsType !== "FIELD_REFERENCE" && Number.isNaN(Number(condition.value2))`;

code = code.replace(t2, r2);
code = code.replace(t3, r3);

fs.writeFileSync("src/components/rule-builder/condition-editor.tsx", code, "utf8");

