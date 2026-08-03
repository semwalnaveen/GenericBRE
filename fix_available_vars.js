
const fs = require("fs");
let code = fs.readFileSync("src/lib/available-variables.ts", "utf8");

code = code.replace(
  "if ((action.type === \"Calculate\" || action.type === \"Assign Value\") && action.outputField) {\n        const field = getField(fieldCatalog, action.outputField);\n        add({\n          key: action.outputField,\n          label: field?.label ?? action.outputField,",
  "const outKey = action.outputTarget === \"RUNTIME_VARIABLE\" ? action.outputVariable : action.outputField;\n      if ((action.type === \"Calculate\" || action.type === \"Assign Value\") && outKey) {\n        const field = getField(fieldCatalog, outKey);\n        add({\n          key: outKey,\n          label: field?.label ?? outKey,"
);

fs.writeFileSync("src/lib/available-variables.ts", code, "utf8");
console.log("Done");

