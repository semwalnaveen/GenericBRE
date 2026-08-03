
const fs = require("fs");
let code = fs.readFileSync("src/app/rule-builder/page.tsx", "utf8");

code = code.replace(/\{dependencies\.dependsOn\.map\(name => \([\s\S]*?\}\)/, `
                                {dependencies.dependsOn.map(dep => {
                                  const baseField = getField(fieldCatalog, dep.field);
                                  const fieldLabel = baseField?.label ?? dep.field;
                                  return (
                                    <li key={\`\${dep.ruleId}-\${dep.field}\`} className="text-sm text-foreground flex flex-col gap-0.5">
                                      <div className="flex items-center gap-1.5 font-medium">
                                        <ArrowLeft className="size-3 text-muted-foreground shrink-0" /> 
                                        {dep.ruleName} <span className="text-xs text-muted-foreground font-mono font-normal">({dep.ruleId})</span>
                                      </div>
                                      <div className="pl-4.5 text-xs text-muted-foreground flex items-center gap-1">
                                        <Variable className="size-3" /> {fieldLabel}
                                      </div>
                                    </li>
                                  )
                                })}
`);

code = code.replace(/\{dependencies\.usedBy\.map\(name => \([\s\S]*?\}\)/, `
                                {dependencies.usedBy.map(dep => {
                                  const baseField = getField(fieldCatalog, dep.field);
                                  const fieldLabel = baseField?.label ?? dep.field;
                                  return (
                                    <li key={\`\${dep.ruleId}-\${dep.field}\`} className="text-sm text-foreground flex flex-col gap-0.5">
                                      <div className="flex items-center gap-1.5 font-medium">
                                        <ArrowLeft className="size-3 text-muted-foreground rotate-180 shrink-0" /> 
                                        {dep.ruleName} <span className="text-xs text-muted-foreground font-mono font-normal">({dep.ruleId})</span>
                                      </div>
                                      <div className="pl-4.5 text-xs text-muted-foreground flex items-center gap-1">
                                        <Variable className="size-3" /> {fieldLabel}
                                      </div>
                                    </li>
                                  )
                                })}
`);

fs.writeFileSync("src/app/rule-builder/page.tsx", code, "utf8");
console.log("Done");

