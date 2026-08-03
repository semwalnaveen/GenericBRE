
const fs = require("fs");
let code = fs.readFileSync("src/components/rule-builder/action-editor.tsx", "utf8");

// First, we need to add a Toggle Group or Radio Group to action-editor.tsx.
// Let us just use a simple RadioGroup, or even simpler: two toggle buttons.
// The file imports Button, maybe we can use two small buttons to mimic a toggle.
code = code.replace(
  "import { Input } from \"@/components/ui/input\";",
  "import { Input } from \"@/components/ui/input\";\nimport { RadioGroup, RadioGroupItem } from \"@/components/ui/radio-group\";\nimport { Label } from \"@/components/ui/label\";"
);

const oldNeedsOutput = `          {needsOutput && (
            <>
              <OutputFieldPicker
                value={action.outputField ?? ""}
                domain={domain}
                rules={rules}
                currentRuleId={currentRuleId}
                onChange={(key) => onChange({ outputField: key })}
              />
              <Select
                value={action.outputType ?? "number"}
                onValueChange={(v) => onChange({ outputType: v as FieldDataType })}
              >
                <SelectTrigger size="sm" className="h-8 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OUTPUT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>`;

const newNeedsOutput = `          {needsOutput && (
            <>
              <div className="sm:col-span-2 flex items-center gap-4 bg-muted/30 p-2 rounded-md border">
                <span className="text-xs font-medium text-muted-foreground">Target:</span>
                <RadioGroup 
                  className="flex items-center gap-4" 
                  value={action.outputTarget ?? "BUSINESS_FIELD"} 
                  onValueChange={(v) => onChange({ outputTarget: v as "BUSINESS_FIELD" | "RUNTIME_VARIABLE", outputField: undefined, outputVariable: undefined })}
                >
                  <div className="flex items-center space-x-1.5">
                    <RadioGroupItem value="BUSINESS_FIELD" id="target-field" />
                    <Label htmlFor="target-field" className="text-xs font-normal cursor-pointer">Business Field</Label>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <RadioGroupItem value="RUNTIME_VARIABLE" id="target-var" />
                    <Label htmlFor="target-var" className="text-xs font-normal cursor-pointer">Runtime Variable</Label>
                  </div>
                </RadioGroup>
              </div>
              
              {(action.outputTarget ?? "BUSINESS_FIELD") === "BUSINESS_FIELD" ? (
                <OutputFieldPicker
                  value={action.outputField ?? ""}
                  domain={domain}
                  rules={rules}
                  currentRuleId={currentRuleId}
                  onChange={(key) => onChange({ outputField: key })}
                />
              ) : (
                <Input
                  placeholder="Variable Name (e.g. Calculated LTV)"
                  value={action.outputVariable ?? ""}
                  onChange={(e) => onChange({ outputVariable: e.target.value })}
                  className="h-8 w-full text-sm"
                />
              )}
              
              <Select
                value={action.outputType ?? "number"}
                onValueChange={(v) => onChange({ outputType: v as FieldDataType })}
              >
                <SelectTrigger size="sm" className="h-8 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OUTPUT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>`;

code = code.replace(oldNeedsOutput, newNeedsOutput);

fs.writeFileSync("src/components/rule-builder/action-editor.tsx", code, "utf8");
console.log("Done");

