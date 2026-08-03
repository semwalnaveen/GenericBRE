
const fs = require("fs");
let code = fs.readFileSync("src/app/rule-builder/page.tsx", "utf8");

code = code.replace("collectRuleDependencies,", "collectRuleDependencies,\n  collectRuleDependencyDetails,");

fs.writeFileSync("src/app/rule-builder/page.tsx", code, "utf8");
console.log("Done");

