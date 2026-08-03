
const fs = require("fs");
let code = fs.readFileSync("src/app/rule-builder/page.tsx", "utf8");

const oldBlock = `<ScrollArea className="min-h-0 flex-1">
        <div className="flex w-full flex-col gap-4 px-5 py-5 sm:px-6">
          <MetadataForm data={rule} onChange={patchRule} errors={errors} />`;

const newBlock = `<Tabs defaultValue="logic" className="flex min-h-0 flex-1 flex-col">
        <div className="border-b bg-card px-5 sm:px-6">
          <TabsList className="bg-transparent h-12">
            <TabsTrigger value="logic" className="data-[state=active]:bg-muted">Logic & Actions</TabsTrigger>
            <TabsTrigger value="config" className="data-[state=active]:bg-muted">Configuration</TabsTrigger>
            <TabsTrigger value="test" className="data-[state=active]:bg-muted">Simulation</TabsTrigger>
          </TabsList>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <TabsContent value="config" className="m-0 p-5 sm:p-6 space-y-6">
            <MetadataForm data={rule} onChange={patchRule} errors={errors} />
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                Available Attributes
              </h2>
              <div className="h-[500px] rounded-xl border bg-card/50 p-2 shadow-sm">
                <AttributePanel
                  fields={fieldsForDomain(fieldCatalog, rule.domain)}
                  entities={entities}
                  onAddField={addFieldToRoot}
                />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="logic" className="m-0 p-5 sm:p-6 flex flex-col gap-4">`;

code = code.replace(oldBlock, newBlock);

const endScrollArea = `</div>
      </ScrollArea>`;
const newEndScrollArea = `</TabsContent>
          <TabsContent value="test" className="m-0 p-5 sm:p-6 h-full">
            <InlineTestPanel
              rootGroup={rule.rootGroup}
              actions={rule.actions}
              elseActions={rule.elseActions}
            />
          </TabsContent>
        </ScrollArea>
      </Tabs>`;
code = code.replace(endScrollArea, newEndScrollArea);

// Remove the inline Test Panel from the sidebar Tabs:
const oldSidebarTestTab = `<TabsTrigger value="test" className="text-xs px-1">Test</TabsTrigger>`;
code = code.replace(oldSidebarTestTab, "");

const oldSidebarTestContent = `<TabsContent value="test" className="m-0 space-y-4">
                        <InlineTestPanel
                          rootGroup={rule.rootGroup}
                          actions={rule.actions}
                          elseActions={rule.elseActions}
                        />
                      </TabsContent>`;
code = code.replace(oldSidebarTestContent, "");

// Remove the inline AttributePanel from the sidebar Tabs:
const oldSidebarAttrTab = `<TabsTrigger value="attributes" className="text-xs px-1">Attrs</TabsTrigger>`;
code = code.replace(oldSidebarAttrTab, "");

const oldSidebarAttrContent = `<TabsContent value="attributes" className="m-0 h-full">
                        <AttributePanel
                          fields={fieldsForDomain(fieldCatalog, rule.domain)}
                          entities={entities}
                          onAddField={addFieldToRoot}
                        />
                      </TabsContent>`;
code = code.replace(oldSidebarAttrContent, "");

// Change the sidebar default value to preview
code = code.replace(`defaultValue="attributes" className="flex h-full flex-col"`, `defaultValue="preview" className="flex h-full flex-col"`);
// Fix grid-cols-4 to grid-cols-2 for sidebar
code = code.replace(`grid w-full grid-cols-4 shrink-0`, `grid w-full grid-cols-2 shrink-0`);


fs.writeFileSync("src/app/rule-builder/page.tsx", code, "utf8");
console.log("Refactoring complete");

