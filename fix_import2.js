const fs = require('fs');
let code = fs.readFileSync('src/app/rule-builder/page.tsx', 'utf8');

code = code.replace(/Network[\r\n]+} from "lucide-react";/, 'Network,\n  Variable\n} from "lucide-react";');

fs.writeFileSync('src/app/rule-builder/page.tsx', code, 'utf8');
console.log('Done Variable import');
