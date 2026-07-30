"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Boxes } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { BusinessRule, Priority } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const PRIORITIES: Priority[] = [1, 2, 3, 4, 5];
const PRIORITY_LABEL: Record<Priority, string> = { 1: "P1 · Critical", 2: "P2 · High", 3: "P3 · Medium", 4: "P4 · Low", 5: "P5 · Lowest" };

// Map-to-Product dialog — opens right after "Submit Rule". The Maker maps the
// rule to one or more products/categories and either saves the mapping (stay
// Draft) or submits the complete configuration for Checker approval. A rule
// can't reach Pending Approval without at least one product mapping.
export function MapToProductDialog({
  open,
  onOpenChange,
  rule,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rule: BusinessRule | null;
  /** Called after a successful Submit for Approval (e.g. navigate to Repository). */
  onSubmitted?: () => void;
}) {
  const products = useAppStore((s) => s.products);
  const ruleCategories = useAppStore((s) => s.ruleCategories);
  const productRuleMappings = useAppStore((s) => s.productRuleMappings);
  const mapRuleToProducts = useAppStore((s) => s.mapRuleToProducts);
  const submitForReview = useAppStore((s) => s.submitForReview);

  const [productIds, setProductIds] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<Priority>(3);
  const [sequence, setSequence] = useState<string>("1");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [remarks, setRemarks] = useState("");

  // Prefill from the rule + any existing mapping every time the dialog opens.
  useEffect(() => {
    if (!open || !rule) return;
    const existing = productRuleMappings.filter((m) => m.ruleId === rule.id);
    /* eslint-disable react-hooks/set-state-in-effect */
    setProductIds(existing.map((m) => m.productId));
    setCategory(rule.category);
    setPriority(rule.priority);
    setSequence(String(existing[0]?.order ?? rule.sequence ?? 1));
    setEffectiveDate(existing[0]?.effectiveDate ?? "");
    setRemarks(existing[0]?.remarks ?? "");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, rule, productRuleMappings]);

  if (!rule) return null;

  const buildConfig = () => ({
    productIds,
    categoryId: category || undefined,
    priority,
    sequence: Number(sequence) || 0,
    effectiveDate: effectiveDate || undefined,
    remarks: remarks.trim() || undefined,
  });

  const handleSaveMapping = () => {
    if (productIds.length === 0) {
      toast.error("Select at least one product to map.");
      return;
    }
    const res = mapRuleToProducts(rule.id, buildConfig());
    if (!res.ok) {
      toast.error("Couldn't save mapping", { description: res.reason });
      return;
    }
    toast.success("Mapping saved", { description: `${rule.id} mapped to ${productIds.length} product(s).` });
    onOpenChange(false);
  };

  const handleSubmitForApproval = () => {
    if (productIds.length === 0) {
      toast.error("Map at least one product before submitting for approval.");
      return;
    }
    const mapped = mapRuleToProducts(rule.id, buildConfig());
    if (!mapped.ok) {
      toast.error("Couldn't save mapping", { description: mapped.reason });
      return;
    }
    const submitted = submitForReview(rule.id);
    if (!submitted.ok) {
      toast.error("Couldn't submit for approval", { description: submitted.reason });
      return;
    }
    toast.success("Submitted for approval", { description: `${rule.id} · ${rule.name} is now Pending Approval.` });
    onOpenChange(false);
    onSubmitted?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Boxes className="size-4 text-primary" /> Map Rule to Product
          </DialogTitle>
          <DialogDescription>
            The Checker reviews the rule together with this mapping — configure it before submitting for approval.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[68vh] space-y-3.5 overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label>Product(s) *</Label>
            <MultiSelect
              label="Select products"
              options={products.map((p) => ({ value: p.id, label: p.name }))}
              selected={productIds}
              onChange={setProductIds}
              className="w-full justify-between"
            />
            {productIds.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {productIds.map((id) => products.find((p) => p.id === id)?.name ?? id).join(", ")}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select items={Object.fromEntries(ruleCategories.map((c) => [c.name, c.name]))} value={category} onValueChange={(v) => setCategory((v as string) ?? "")}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {ruleCategories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Execution Sequence</Label>
              <Input type="number" min={0} value={sequence} onChange={(e) => setSequence(e.target.value)} placeholder="1" />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>Effective Date</Label>
              <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Remarks</Label>
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional note for the reviewer…" rows={2} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={handleSaveMapping}>Save Mapping</Button>
          <Button onClick={handleSubmitForApproval}>Submit for Approval</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
