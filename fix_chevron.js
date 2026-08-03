
const fs = require("fs");
let code = fs.readFileSync("src/components/rule-builder/condition-editor.tsx", "utf8");
code = code.replace(`showChevron={false}`, ``);
fs.writeFileSync("src/components/rule-builder/condition-editor.tsx", code, "utf8");

