const fs = require('fs');
let code = fs.readFileSync('src/app/rule-builder/page.tsx', 'utf8');

code = code.replace('collectRuleDependencies } from "@/lib/condition-tree";', 'collectRuleDependencies, collectRuleDependencyDetails } from "@/lib/condition-tree";');

const oldHookRegex = /  const dependencies = useMemo\(\(\) => \{[\s\S]*?\}, \[rule, rules\]\);/;

const newHook = `  const dependencies = useMemo(() => {
    const dependsOn = new Map<string, { ruleName: string, ruleId: string, field: string }>();
    const usedBy = new Map<string, { ruleName: string, ruleId: string, field: string }>();

    // Depends On: Walk this rule's conditions for explicitly selected RULE_OUTPUTs.
    const ruleDeps = collectRuleDependencyDetails(rule.rootGroup);
    ruleDeps.forEach(dep => {
      const sourceRule = rules.find(r => r.id === dep.ruleId);
      if (sourceRule) {
        const key = \`\${dep.ruleId}-\${dep.field}\`;
        dependsOn.set(key, { ruleName: sourceRule.name, ruleId: sourceRule.id, field: dep.field });
      }
    });

    // Used By: Check every other rule to see if it explicitly depends on this rule's outputs.
    rules.forEach(r => {
      if (r.id === rule.id) return;
      const theirDeps = collectRuleDependencyDetails(r.rootGroup);
      theirDeps.forEach(dep => {
        if (dep.ruleId === rule.id) {
          const key = \`\${r.id}-\${dep.field}\`;
          usedBy.set(key, { ruleName: r.name, ruleId: r.id, field: dep.field });
        }
      });
    });

    return { dependsOn: Array.from(dependsOn.values()), usedBy: Array.from(usedBy.values()) };
  }, [rule, rules]);`;

code = code.replace(oldHookRegex, newHook);

const uiOldDependsOn = `{dependencies.dependsOn.length > 0 ? (
                              <ul className="space-y-1">
                                {dependencies.dependsOn.map(name => (
                                  <li key={name} className="text-sm text-foreground flex items-center gap-1.5"><ArrowLeft className="size-3 text-muted-foreground" /> {name}</li>
                                ))}
                              </ul>
                            ) : (`;

const uiNewDependsOn = `{dependencies.dependsOn.length > 0 ? (
                              <ul className="space-y-2">
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
                              </ul>
                            ) : (`;

code = code.replace(uiOldDependsOn, uiNewDependsOn);

const uiOldUsedBy = `{dependencies.usedBy.length > 0 ? (
                              <ul className="space-y-1">
                                {dependencies.usedBy.map(name => (
                                  <li key={name} className="text-sm text-foreground flex items-center gap-1.5"><ArrowRight className="size-3 text-muted-foreground" /> {name}</li>
                                ))}
                              </ul>
                            ) : (`;

const uiNewUsedBy = `{dependencies.usedBy.length > 0 ? (
                              <ul className="space-y-2">
                                {dependencies.usedBy.map(dep => {
                                  const baseField = getField(fieldCatalog, dep.field);
                                  const fieldLabel = baseField?.label ?? dep.field;
                                  return (
                                    <li key={\`\${dep.ruleId}-\${dep.field}\`} className="text-sm text-foreground flex flex-col gap-0.5">
                                      <div className="flex items-center gap-1.5 font-medium">
                                        <ArrowRight className="size-3 text-muted-foreground shrink-0" /> 
                                        {dep.ruleName} <span className="text-xs text-muted-foreground font-mono font-normal">({dep.ruleId})</span>
                                      </div>
                                      <div className="pl-4.5 text-xs text-muted-foreground flex items-center gap-1">
                                        <Variable className="size-3" /> {fieldLabel}
                                      </div>
                                    </li>
                                  )
                                })}
                              </ul>
                            ) : (`;

code = code.replace(uiOldUsedBy, uiNewUsedBy);

fs.writeFileSync('src/app/rule-builder/page.tsx', code, 'utf8');
console.log('Done page');
