"use client";

import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { Trash2, Upload, Wand2, FileJson, Save, ArrowDown, ArrowUp, Package, Search } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { JsonMapping, JsonMappingEntry, FieldDataType } from "@/lib/types";
import { flattenJson, FlattenedAttribute } from "@/lib/json-mapping";
import { buildTemplateJson, buildResponseShapePreview } from "@/lib/simulator-json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

const FIELD_TYPES: FieldDataType[] = ["number", "string", "boolean", "enum", "currency", "list"];

function entriesFromFlattened(flattened: FlattenedAttribute[], existing: JsonMappingEntry[]): JsonMappingEntry[] {
  // Preserve any manual mappedField/transformationRule/required edits on
  // attributes that still exist after re-generating from the product's
  // current template/response shape — only genuinely new paths get a fresh
  // Unmapped row.
  const byPath = new Map(existing.map((e) => [e.jsonPath, e]));
  return flattened.map((f) => {
    const prior = byPath.get(f.path);
    if (prior) return prior;
    return {
      id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      externalAttribute: f.path.split(/[.[]/).pop()?.replace("]", "") || f.path,
      jsonPath: f.path,
      dataType: f.inferredType,
      required: false,
      status: "Unmapped",
    };
  });
}

export function JsonMappingManager() {
  const jsonMappings = useAppStore((s) => s.jsonMappings);
  const industries = useAppStore((s) => s.industries);
  const products = useAppStore((s) => s.products);
  const fieldCatalog = useAppStore((s) => s.fieldCatalog);
  const rules = useAppStore((s) => s.rules);
  const productRuleMappings = useAppStore((s) => s.productRuleMappings);
  const addJsonMapping = useAppStore((s) => s.addJsonMapping);
  const updateJsonMapping = useAppStore((s) => s.updateJsonMapping);
  const deleteJsonMapping = useAppStore((s) => s.deleteJsonMapping);

  const [domainFilter, setDomainFilter] = useState<string>(industries[0]?.id ?? "");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    () => products.find((p) => p.domain === (industries[0]?.id ?? ""))?.id ?? null
  );
  const [activeDirection, setActiveDirection] = useState<"request" | "response">("request");
  const [payloadText, setPayloadText] = useState("");
  const [pendingDelete, setPendingDelete] = useState<JsonMapping | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Mapped" | "Unmapped">("All");
  const fileRef = useRef<HTMLInputElement>(null);

  const productsForDomain = products.filter((p) => p.domain === domainFilter);
  const selectedProduct = selectedProductId ? products.find((p) => p.id === selectedProductId) ?? null : null;

  const requestMapping = selectedProduct ? jsonMappings.find((m) => m.productId === selectedProduct.id && m.direction === "request") ?? null : null;
  const responseMapping = selectedProduct ? jsonMappings.find((m) => m.productId === selectedProduct.id && m.direction === "response") ?? null : null;
  const active = activeDirection === "request" ? requestMapping : responseMapping;

  // Exactly one Request + one Response mapping per product — auto-created the
  // instant a product is selected, generated from the product's own rules
  // (buildTemplateJson / buildResponseShapePreview, the same functions the
  // Rule Simulator uses), never gated on Run Simulation. This is the only
  // creation path now — no "Add New Mapping" button, so uniqueness holds by
  // construction.
  useEffect(() => {
    if (!selectedProduct) return;
    if (!requestMapping) {
      const templateJson = buildTemplateJson(selectedProduct, rules, productRuleMappings, fieldCatalog);
      const entries = entriesFromFlattened(flattenJson(templateJson), []);
      addJsonMapping({
        id: `jm-${selectedProduct.id}-request`,
        name: `${selectedProduct.name} — Request Mapping`,
        industry: selectedProduct.domain,
        productId: selectedProduct.id,
        direction: "request",
        entries,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    if (!responseMapping) {
      const responseShape = buildResponseShapePreview(selectedProduct, rules, productRuleMappings);
      const entries = entriesFromFlattened(flattenJson(responseShape), []);
      addJsonMapping({
        id: `jm-${selectedProduct.id}-response`,
        name: `${selectedProduct.name} — Response Mapping`,
        industry: selectedProduct.domain,
        productId: selectedProduct.id,
        direction: "response",
        entries,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct?.id, !!requestMapping, !!responseMapping]);

  // Sample payload preview shown alongside the attribute table — regenerates
  // from the live product shape whenever the selection changes, but stays a
  // free-editable textarea so a real captured payload can be pasted in and
  // re-detected instead.
  useEffect(() => {
    if (!selectedProduct) {
      setPayloadText("");
      return;
    }
    const shape = activeDirection === "request"
      ? buildTemplateJson(selectedProduct, rules, productRuleMappings, fieldCatalog)
      : buildResponseShapePreview(selectedProduct, rules, productRuleMappings);
    setPayloadText(JSON.stringify(shape, null, 2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct?.id, activeDirection]);

  const updateActive = (patch: Partial<JsonMapping>) => {
    if (!active) return;
    updateJsonMapping(active.id, patch);
  };

  const detectAttributes = () => {
    if (!active) return;
    if (!payloadText.trim()) {
      toast.error("Paste or upload a sample JSON payload first.");
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(payloadText);
    } catch {
      toast.error("That isn't valid JSON.");
      return;
    }
    const entries = entriesFromFlattened(flattenJson(parsed), active.entries);
    updateActive({ entries });
    toast.success(`Detected ${entries.length} attribute(s) from payload.`);
  };

  const updateEntry = (entryId: string, patch: Partial<JsonMappingEntry>) => {
    if (!active) return;
    const entries = active.entries.map((e) =>
      e.id === entryId ? { ...e, ...patch, status: (patch.mappedField ?? e.mappedField) ? "Mapped" as const : "Unmapped" as const } : e
    );
    updateActive({ entries });
  };

  const removeEntry = (entryId: string) => {
    if (!active) return;
    updateActive({ entries: active.entries.filter((e) => e.id !== entryId) });
  };

  const save = () => {
    if (!active) return;
    toast.success(`"${active.name}" saved — ${active.entries.filter((e) => e.status === "Mapped").length} of ${active.entries.length} attributes mapped.`);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteJsonMapping(pendingDelete.id);
    toast.info(`"${pendingDelete.name}" removed — it will regenerate the next time this product is selected.`);
    setPendingDelete(null);
  };

  const industryFields = active ? fieldCatalog.filter((f) => f.domain === active.industry || f.domain === "Common") : [];
  const filteredEntries = active?.entries.filter((entry) => {
    const matchesSearch = entry.externalAttribute.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          entry.jsonPath.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || entry.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) ?? [];

  return (
    <div className="flex h-full min-h-100 gap-4">
      <div className="w-56 shrink-0 space-y-3">
        <div className="space-y-1.5">
          <Label className="text-sm text-muted-foreground">Domain</Label>
          <Select
            value={domainFilter}
            onValueChange={(v) => {
              const nextDomain = (v as string) ?? "";
              setDomainFilter(nextDomain);
              setSelectedProductId(products.find((p) => p.domain === nextDomain)?.id ?? null);
            }}
          >
            <SelectTrigger className="w-full h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {industries.map((i) => (
                <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-muted-foreground">Product</p>
          <div className="max-h-125 space-y-1 overflow-y-auto">
            {productsForDomain.map((p) => (
              <button
                key={p.id}
                onClick={() => { setSelectedProductId(p.id); setActiveDirection("request"); }}
                className={`flex w-full items-center gap-2 rounded-lg border p-2.5 text-left transition-colors ${selectedProductId === p.id ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
              >
                <Package className="size-3.5 shrink-0 text-muted-foreground" />
                <p className="truncate text-sm font-semibold">{p.name}</p>
              </button>
            ))}
            {productsForDomain.length === 0 && (
              <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                No products in this domain yet.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        {!selectedProduct ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
            Select a product — its Request and Response mappings auto-generate from its rules.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex overflow-hidden rounded-lg border w-fit">
              <button
                onClick={() => setActiveDirection("request")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold transition-colors ${activeDirection === "request" ? "bg-blue-600 text-white" : "hover:bg-accent"}`}
              >
                <ArrowUp className="size-3.5" /> Request Mapping
              </button>
              <button
                onClick={() => setActiveDirection("response")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold transition-colors ${activeDirection === "response" ? "bg-emerald-600 text-white" : "hover:bg-accent"}`}
              >
                <ArrowDown className="size-3.5" /> Response Mapping
              </button>
            </div>

            {!active ? (
              <div className="flex h-40 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                Generating mapping…
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 rounded-xl border bg-card p-3.5 sm:grid-cols-3">
                  <div className="min-w-0 space-y-1.5 sm:col-span-2">
                    <Label>Name</Label>
                    <Input value={active.name} disabled />
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <Label>Product</Label>
                    <Input value={selectedProduct.name} disabled />
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border bg-card p-3.5">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5 text-sm">
                      <FileJson className="size-3.5" /> Sample JSON Payload
                    </Label>
                    <div className="flex gap-1.5">
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) file.text().then(setPayloadText);
                          e.target.value = "";
                        }}
                      />
                      <Button variant="outline" size="sm" className="h-7 gap-1.5 text-sm" onClick={() => fileRef.current?.click()}>
                        <Upload className="size-3.5" /> Upload
                      </Button>
                      <Button size="sm" className="h-7 gap-1.5 text-sm" onClick={detectAttributes}>
                        <Wand2 className="size-3.5" /> Detect Attributes
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={payloadText}
                    onChange={(e) => setPayloadText(e.target.value)}
                    className="min-h-24 max-h-[320px] resize-none overflow-y-auto font-mono text-sm"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Search attributes or paths..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 pl-8 text-sm"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "All" | "Mapped" | "Unmapped")}>
                    <SelectTrigger className="h-8 w-32 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Status</SelectItem>
                      <SelectItem value="Mapped">Mapped</SelectItem>
                      <SelectItem value="Unmapped">Unmapped</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full max-h-[320px] overflow-x-auto overflow-y-auto rounded-xl border">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-card">
                      <TableRow className="hover:bg-transparent">
                        <TableHead>External Attribute</TableHead>
                        <TableHead>JSON Path</TableHead>
                        <TableHead>Mapped Field</TableHead>
                        <TableHead>Data Type</TableHead>
                        <TableHead className="w-16">Req.</TableHead>
                        <TableHead>Transformation</TableHead>
                        <TableHead>Default</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-mono text-sm">{entry.externalAttribute}</TableCell>
                          <TableCell className="font-mono text-sm text-muted-foreground">{entry.jsonPath}</TableCell>
                          <TableCell>
                            <Select
                              items={{ "": "Unmapped", ...Object.fromEntries(industryFields.map((f) => [f.key, f.label])) }}
                              value={entry.mappedField ?? ""}
                              onValueChange={(v) => updateEntry(entry.id, { mappedField: v ? (v as string) : undefined })}
                            >
                              <SelectTrigger size="sm" className="h-8 w-40"><SelectValue placeholder="Unmapped" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">Unmapped</SelectItem>
                                {industryFields.map((f) => (
                                  <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select value={entry.dataType} onValueChange={(v) => updateEntry(entry.id, { dataType: (v as FieldDataType) ?? "string" })}>
                              <SelectTrigger size="sm" className="h-8 w-24"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {FIELD_TYPES.map((t) => (
                                  <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Checkbox checked={entry.required} onCheckedChange={(v) => updateEntry(entry.id, { required: !!v })} />
                          </TableCell>
                          <TableCell>
                            <Select value={entry.transformationRule ?? ""} onValueChange={(v) => updateEntry(entry.id, { transformationRule: v || undefined })}>
                              <SelectTrigger size="sm" className="h-8 w-32"><SelectValue placeholder="None" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">None</SelectItem>
                                <SelectItem value="uppercase">Uppercase</SelectItem>
                                <SelectItem value="lowercase">Lowercase</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={entry.defaultValue ?? ""}
                              onChange={(e) => updateEntry(entry.id, { defaultValue: e.target.value || undefined })}
                              placeholder="Default value"
                              className="h-8 w-28 text-sm"
                            />
                          </TableCell>
                          <TableCell>
                            <Badge variant={entry.status === "Mapped" ? "default" : "secondary"} className="text-sm">
                              {entry.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" onClick={() => removeEntry(entry.id)}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredEntries.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="py-6 text-center text-sm text-muted-foreground">
                            No attributes yet — paste a sample payload above and click Detect Attributes.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-sm text-destructive hover:text-destructive"
                    onClick={() => setPendingDelete(active)}
                  >
                    <Trash2 className="size-3.5" /> Delete Mapping
                  </Button>
                  <Button size="sm" className="ml-auto gap-1.5" onClick={save}>
                    <Save className="size-3.5" /> Save Changes
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{pendingDelete?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>It will regenerate automatically the next time this product is selected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
