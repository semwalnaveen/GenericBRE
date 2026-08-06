"use client";

import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { Trash2, Upload, Wand2, FileJson, Save, ArrowDown, ArrowUp, ArrowUpDown, Package, Search, Settings2, ChevronLeft, ChevronRight, X } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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

type SortColumn = "externalAttribute" | "jsonPath" | "mappedField" | "dataType" | "required" | "transformationRule" | "defaultValue" | "status";

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
  const [statusFilter, setStatusFilter] = useState<"all" | "Mapped" | "Unmapped" | "">("");
  const [requiredFilter, setRequiredFilter] = useState<"all" | "Required" | "Not Required" | "">("");
  const [dataTypeFilter, setDataTypeFilter] = useState<"all" | FieldDataType | "">("");
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const fileRef = useRef<HTMLInputElement>(null);

  const [valueMapModalOpen, setValueMapModalOpen] = useState<string | null>(null);
  const [draftValueMapText, setDraftValueMapText] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

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
    if (active?.samplePayload) {
      setPayloadText(active.samplePayload);
      return;
    }
    const shape = activeDirection === "request"
      ? buildTemplateJson(selectedProduct, rules, productRuleMappings, fieldCatalog)
      : buildResponseShapePreview(selectedProduct, rules, productRuleMappings);
    setPayloadText(JSON.stringify(shape, null, 2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct?.id, activeDirection, active?.samplePayload]);

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
    setDrawerOpen(true);
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

  const handleOpenValueMap = (entry: JsonMappingEntry) => {
    setValueMapModalOpen(entry.id);
    setDraftValueMapText(entry.valueMap ? JSON.stringify(entry.valueMap, null, 2) : "{\n  \n}");
  };

  const handleSaveValueMap = () => {
    if (!valueMapModalOpen) return;
    try {
      const parsed = JSON.parse(draftValueMapText);
      updateEntry(valueMapModalOpen, { valueMap: Object.keys(parsed).length > 0 ? parsed : undefined });
      setValueMapModalOpen(null);
      toast.success("Value map saved.");
    } catch {
      toast.error("Invalid JSON format for Value Map.");
    }
  };

  const save = () => {
    if (!active) return;
    updateActive({ samplePayload: payloadText });
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
    const matchesStatus = statusFilter === "" || statusFilter === "all" || entry.status === statusFilter;
    const matchesRequired = requiredFilter === "" || requiredFilter === "all" || (requiredFilter === "Required" ? entry.required : !entry.required);
    const matchesDataType = dataTypeFilter === "" || dataTypeFilter === "all" || entry.dataType === dataTypeFilter;

    return matchesSearch && matchesStatus && matchesRequired && matchesDataType;
  }) ?? [];

  const hasActiveFilters = searchQuery !== "" || (statusFilter !== "" && statusFilter !== "all") || (requiredFilter !== "" && requiredFilter !== "all") || (dataTypeFilter !== "" && dataTypeFilter !== "all");

  const sortedEntries = [...filteredEntries].sort((a, b) => {
    if (!sortColumn) return 0;
    const valA = a[sortColumn] ?? "";
    const valB = b[sortColumn] ?? "";
    if (valA < valB) return sortDirection === "asc" ? -1 : 1;
    if (valA > valB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") setSortDirection("desc");
      else setSortColumn(null);
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, requiredFilter, dataTypeFilter, active?.id, sortColumn, sortDirection]);

  const PAGE_SIZE = 6;
  const totalPages = Math.max(1, Math.ceil(sortedEntries.length / PAGE_SIZE));
  const paginatedEntries = sortedEntries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const renderSortableHeader = (label: string, column: SortColumn, extraClass = "") => (
    <TableHead className={`cursor-pointer hover:bg-muted/50 transition-colors select-none text-[11px] uppercase tracking-wider font-bold text-foreground h-10 ${extraClass}`} onClick={() => handleSort(column)}>
      <div className="flex items-center gap-1.5">
        {label}
        {sortColumn === column ? (
          sortDirection === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
        ) : (
          <ArrowUpDown className="size-3 text-muted-foreground/30" />
        )}
      </div>
    </TableHead>
  );

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6">
      <div className="w-full lg:w-64 shrink-0 flex flex-col gap-5">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground">Domain</Label>
          <Select
            value={domainFilter}
            onValueChange={(v) => {
              const nextDomain = (v as string) ?? "";
              setDomainFilter(nextDomain);
              setSelectedProductId(products.find((p) => p.domain === nextDomain)?.id ?? null);
            }}
          >
            <SelectTrigger className="w-full h-9 bg-card shadow-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {industries.map((i) => (
                <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground">Product</Label>
          <Select
            value={selectedProductId ?? undefined}
            onValueChange={(v) => { setSelectedProductId(v); setActiveDirection("request"); }}
          >
            <SelectTrigger className="w-full h-9 bg-card shadow-sm">
              <SelectValue placeholder="Select a product" />
            </SelectTrigger>
            <SelectContent>
              {productsForDomain.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <div className="flex items-center gap-2">
                    <Package className="size-3.5 text-muted-foreground" />
                    <span>{p.name}</span>
                  </div>
                </SelectItem>
              ))}
              {productsForDomain.length === 0 && (
                <SelectItem value="none" disabled>No products in domain</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {active && selectedProduct && (
          <div className="mt-2 space-y-4 rounded-xl border border-border/50 bg-card/40 p-3.5 shadow-sm backdrop-blur-xl">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mapping Name</Label>
              <Input value={active.name} disabled className="h-8 text-xs bg-background/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mapped Product</Label>
              <Input value={selectedProduct.name} disabled className="h-8 text-xs bg-background/50" />
            </div>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 flex flex-col">
        {!selectedProduct ? (
          <div className="flex h-40 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
            Select a product — its Request and Response mappings auto-generate from its rules.
          </div>
        ) : (
          <div className="space-y-4 flex-1 flex flex-col min-h-0">
            <div className="flex overflow-hidden rounded-lg border w-fit shrink-0">
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
                <div className="flex-1 flex flex-col min-h-0 space-y-3 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl p-3 shadow-sm mt-1">
                  <div className="flex items-center justify-between shrink-0">
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
                      <Button variant="outline" size="sm" className="h-7 gap-1.5 text-sm bg-background/50 hover:bg-background" onClick={() => setDrawerOpen(true)}>
                        <Settings2 className="size-3.5" /> Configure Mappings ({active.entries.length})
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={payloadText}
                    onChange={(e) => setPayloadText(e.target.value)}
                    className="h-[250px] shrink-0 [field-sizing:fixed] resize-none overflow-y-auto font-mono text-xs bg-background/50 border-border/50"
                  />
                </div>

                <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                  <SheetContent side="right" className="!w-screen !max-w-[100vw] p-0 flex flex-col h-screen bg-background/95 backdrop-blur-xl">
                    <SheetHeader className="px-6 py-4 border-b border-border/50">
                      <SheetTitle className="flex items-center gap-2">
                        <Wand2 className="size-5 text-blue-500" />
                        Configure External Attributes
                      </SheetTitle>
                      <SheetDescription>Map detected incoming JSON attributes to internal BRE fields.</SheetDescription>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
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
                        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                          <SelectTrigger className="h-8 w-28 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="Mapped">Mapped</SelectItem>
                            <SelectItem value="Unmapped">Unmapped</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={requiredFilter} onValueChange={(v) => setRequiredFilter(v as any)}>
                          <SelectTrigger className="h-8 w-28 text-sm"><SelectValue placeholder="Required" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="Required">Required</SelectItem>
                            <SelectItem value="Not Required">Not Required</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={dataTypeFilter} onValueChange={(v) => setDataTypeFilter(v as any)}>
                          <SelectTrigger className="h-8 w-28 text-sm"><SelectValue placeholder="Data Type" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {FIELD_TYPES.map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 text-muted-foreground hover:text-foreground px-2"
                          disabled={!hasActiveFilters}
                          onClick={() => {
                            setSearchQuery("");
                            setStatusFilter("");
                            setRequiredFilter("");
                            setDataTypeFilter("");
                          }}
                        >
                          <X className="size-3.5" /> Reset Filters
                        </Button>
                      </div>

                      <div className="w-full max-h-none overflow-x-auto rounded-2xl border border-border/50 bg-card/40 shadow-sm">
                        <Table>
                          <TableHeader className="sticky top-0 z-10 bg-muted/40 backdrop-blur-xl border-b border-border/50">
                            <TableRow className="hover:bg-transparent">
                              {renderSortableHeader("External Attribute", "externalAttribute")}
                              {renderSortableHeader("JSON Path", "jsonPath")}
                              {renderSortableHeader("Mapped Field", "mappedField")}
                              {renderSortableHeader("Data Type", "dataType")}
                              {renderSortableHeader("Req.", "required", "w-20")}
                              {renderSortableHeader("Transformation", "transformationRule")}
                              <TableHead className="text-[11px] uppercase tracking-wider font-bold text-foreground h-10">Value Map</TableHead>
                              {renderSortableHeader("Default", "defaultValue")}
                              {renderSortableHeader("Status", "status")}
                              <TableHead className="w-10" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedEntries.map((entry) => (
                              <TableRow key={entry.id} className="hover:bg-muted/50 transition-colors border-border/50 group/row">
                                <TableCell className="font-mono text-xs font-semibold">{entry.externalAttribute}</TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">{entry.jsonPath}</TableCell>
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
                                  <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2" onClick={() => handleOpenValueMap(entry)}>
                                    <Settings2 className="size-3.5" /> {entry.valueMap ? `Map (${Object.keys(entry.valueMap).length})` : "Map"}
                                  </Button>
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
                                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${entry.status === "Mapped" ? "text-primary" : "text-muted-foreground/80"}`}>
                                    <span className={`size-1.5 rounded-full bg-current ${entry.status === "Mapped" ? "shadow-[0_0_8px_currentColor]" : ""}`} />
                                    {entry.status}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="icon-sm" className="transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => removeEntry(entry.id)}>
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                            {sortedEntries.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={9} className="py-6 text-center text-sm text-muted-foreground">
                                  No attributes yet — paste a sample payload above and click Detect Attributes.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Showing {sortedEntries.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, sortedEntries.length)} of {sortedEntries.length} attributes
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="gap-1 h-8 px-2"
                          >
                            <ChevronLeft className="size-3.5" /> Prev
                          </Button>
                          <div className="flex items-center justify-center px-2 text-sm font-medium">
                            {currentPage} / {totalPages}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="gap-1 h-8 px-2"
                          >
                            Next <ChevronRight className="size-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-sm text-destructive hover:text-destructive"
                          onClick={() => setPendingDelete(active)}
                        >
                          <Trash2 className="size-3.5" /> Delete Mapping
                        </Button>
                        <Button size="sm" className="ml-auto gap-1.5" onClick={() => { save(); setDrawerOpen(false); }}>
                          <Save className="size-3.5" /> Save Changes
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
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

      <Dialog open={!!valueMapModalOpen} onOpenChange={(v) => !v && setValueMapModalOpen(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Value Map</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Translate incoming external values to internal canonical values (e.g., <code>&quot;01&quot;: &quot;Salaried&quot;</code>).
            </p>
            <Textarea
              className="font-mono text-xs min-h-48"
              value={draftValueMapText}
              onChange={(e) => setDraftValueMapText(e.target.value)}
              placeholder='{\n  "ExternalCode": "InternalValue"\n}'
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={handleSaveValueMap}>Save Mapping</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
