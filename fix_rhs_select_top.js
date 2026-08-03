
const fs = require("fs");
let code = fs.readFileSync("src/components/rule-builder/condition-editor.tsx", "utf8");

code = code.replace(
  "const [fieldPickerOpen, setFieldPickerOpen] = useState(false);",
  "const [fieldPickerOpen, setFieldPickerOpen] = useState(false);\n  const [rhsFieldPickerOpen, setRhsFieldPickerOpen] = useState(false);"
);

fs.writeFileSync("src/components/rule-builder/condition-editor.tsx", code, "utf8");

