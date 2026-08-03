
const fs = require("fs");
let code = fs.readFileSync("src/lib/engine.ts", "utf8");

code = code.replace(
  "if (action.type === \"Calculate\" || action.type === \"Assign Value\") {\n      if (action.outputField && action.outputValue !== undefined) {\n        const resolved = resolveActionValue(action, context);\n        if (resolved.error) {\n          if (stepErrors) stepErrors.push(resolved.error);\n        } else {\n          calculatedValues[action.outputField] = resolved.value;\n        }\n      }\n    }",
  "if (action.type === \"Calculate\" || action.type === \"Assign Value\") {\n      const outKey = action.outputTarget === \"RUNTIME_VARIABLE\" ? action.outputVariable : action.outputField;\n      if (outKey && action.outputValue !== undefined) {\n        const resolved = resolveActionValue(action, context);\n        if (resolved.error) {\n          if (stepErrors) stepErrors.push(resolved.error);\n        } else {\n          calculatedValues[outKey] = resolved.value;\n        }\n      }\n    }"
);

fs.writeFileSync("src/lib/engine.ts", code, "utf8");
console.log("Done");

