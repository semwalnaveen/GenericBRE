
const fs = require("fs");
let code = fs.readFileSync("src/components/rule-builder/condition-editor.tsx", "utf8");

const stateBlock = `  const [fieldPickerOpen, setFieldPickerOpen] = useState(false);`;
code = code.replace(stateBlock, `  const [fieldPickerOpen, setFieldPickerOpen] = useState(false);\n  const [rhsFieldPickerOpen, setRhsFieldPickerOpen] = useState(false);`);

const selectFieldBlock = `  const selectField = (key: string, sourceType?: "BUSINESS_FIELD" | "RULE_OUTPUT", sourceRuleId?: string) => {
    recordRecentField(key);
    onChange({ field: key, value: "", value2: undefined, sourceType, sourceRuleId });
    setFieldPickerOpen(false);
  };`;

const rhsSelectFieldBlock = `  const selectField = (key: string, sourceType?: "BUSINESS_FIELD" | "RULE_OUTPUT", sourceRuleId?: string) => {
    recordRecentField(key);
    onChange({ field: key, value: "", value2: undefined, sourceType, sourceRuleId });
    setFieldPickerOpen(false);
  };

  const selectRhsField = (key: string, sourceType?: "BUSINESS_FIELD" | "RULE_OUTPUT", sourceRuleId?: string) => {
    recordRecentField(key);
    onChange({ value: key, value2: undefined, rhsType: "FIELD_REFERENCE", rhsSourceType: sourceType, rhsSourceRuleId: sourceRuleId });
    setRhsFieldPickerOpen(false);
  };`;
code = code.replace(selectFieldBlock, rhsSelectFieldBlock);

const renderValueInputStart = `  const renderValueInput = () => {`;
const renderValueInputReplacement = `  const renderRhsFieldPicker = () => {
    const isRhsRuleOutput = condition.rhsSourceType === "RULE_OUTPUT";
    const rhsVariable = isRhsRuleOutput ? variables.find(v => v.key === condition.value && v.sourceRuleId === condition.rhsSourceRuleId) : undefined;
    const rhsBaseField = getField(fieldCatalog, condition.value);
    const rhsFieldLabel = isRhsRuleOutput ? \`\${rhsBaseField?.label ?? condition.value} (\${rhsVariable?.sourceRuleName})\` : (rhsBaseField?.label ?? condition.value);

    // Filter RHS fields to match LHS data type
    const matchingFields = fields.filter(f => f.type === field?.type);
    const matchingVariables = variables.filter(v => getField(fieldCatalog, v.key)?.type === field?.type);

    return (
      <Popover open={rhsFieldPickerOpen} onOpenChange={setRhsFieldPickerOpen}>
        <PopoverTrigger
          render={<Button variant="outline" size="sm" className={cn("h-8 w-48 justify-between gap-1.5 font-normal", !condition.value && "text-muted-foreground")} />}
        >
          <span className="flex min-w-0 items-center gap-1.5 truncate">
            {rhsVariable && <Variable className="size-3.5 shrink-0 text-primary" />}
            <span className="truncate">{condition.value ? rhsFieldLabel : "Select field..."}</span>
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-0">
          <Command>
            <CommandInput placeholder="Search fields..." />
            <CommandList>
              <CommandEmpty>No matching fields.</CommandEmpty>
              <CommandGroup heading="Business Fields">
                {matchingFields.map((f) => (
                  <CommandItem key={f.key} value={f.label} onSelect={() => selectRhsField(f.key, "BUSINESS_FIELD")} className="gap-2">
                    <Check className={cn("size-3.5", condition.value === f.key && !isRhsRuleOutput ? "opacity-100" : "opacity-0")} />
                    {f.label}
                  </CommandItem>
                ))}
              </CommandGroup>
              {matchingVariables.length > 0 && (
                <CommandGroup heading="Rule Outputs">
                  {matchingVariables.map((v) => {
                    const label = getField(fieldCatalog, v.key)?.label ?? v.key;
                    return (
                      <CommandItem key={\`\${v.key}-\${v.sourceRuleId}\`} value={\`\${label} \${v.sourceRuleName}\`} onSelect={() => selectRhsField(v.key, "RULE_OUTPUT", v.sourceRuleId)} className="gap-2">
                        <Check className={cn("size-3.5", condition.value === v.key && isRhsRuleOutput && condition.rhsSourceRuleId === v.sourceRuleId ? "opacity-100" : "opacity-0")} />
                        <Variable className="size-3.5 shrink-0 text-primary" />
                        <span className="truncate font-medium">{label}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  };

  const renderValueInput = () => {`;
code = code.replace(renderValueInputStart, renderValueInputReplacement);

const jsxValueBlock = `{renderValueInput()}`;
const jsxValueReplacement = `
      <div className="flex items-center gap-1">
        {field?.type !== "boolean" && field?.type !== "enum" && condition.operator !== "in" && condition.operator !== "between" && (
          <Select value={condition.rhsType || "STATIC"} onValueChange={(v) => onChange({ rhsType: v as any, value: "" })}>
            <SelectTrigger size="sm" className="h-8 w-14 px-2 border-0 bg-transparent text-muted-foreground hover:bg-muted/50" title="Toggle Static Value or Field Reference">
              {condition.rhsType === "FIELD_REFERENCE" ? <Variable className="size-4" /> : <span className="font-mono font-bold text-xs">Abc</span>}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="STATIC">Static Value</SelectItem>
              <SelectItem value="FIELD_REFERENCE">Field Reference</SelectItem>
            </SelectContent>
          </Select>
        )}
        {condition.rhsType === "FIELD_REFERENCE" ? renderRhsFieldPicker() : renderValueInput()}
      </div>
`;
code = code.replace(jsxValueBlock, jsxValueReplacement);

fs.writeFileSync("src/components/rule-builder/condition-editor.tsx", code, "utf8");
console.log("Refactored condition-editor.tsx cleanly!");

