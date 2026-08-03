
const fs = require("fs");
let code = fs.readFileSync("src/app/rule-builder/page.tsx", "utf8");

const oldTabsList = `<TabsList className="grid w-full grid-cols-2 shrink-0">
                        
                        <TabsTrigger value="preview" className="text-xs px-1">Preview</TabsTrigger>
                        
                        <TabsTrigger value="deps" className="text-xs px-1">Deps</TabsTrigger>
                      </TabsList>`;
const newTabsList = `<TabsList className="grid w-full grid-cols-4 shrink-0">
                        <TabsTrigger value="attributes" className="text-xs px-1">Attrs</TabsTrigger>
                        <TabsTrigger value="preview" className="text-xs px-1">Preview</TabsTrigger>
                        <TabsTrigger value="test" className="text-xs px-1">Test</TabsTrigger>
                        <TabsTrigger value="deps" className="text-xs px-1">Deps</TabsTrigger>
                      </TabsList>`;

code = code.replace(oldTabsList, newTabsList);
fs.writeFileSync("src/app/rule-builder/page.tsx", code, "utf8");

