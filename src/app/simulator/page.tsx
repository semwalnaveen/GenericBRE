"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FlaskConical, FileSpreadsheet } from "lucide-react";
import { useAccessibleProducts } from "@/lib/store";
import { Product } from "@/lib/types";
import { useRunSimulator } from "@/components/simulator/run-simulator-panel";
import { RunSimulatorRedesigned } from "@/components/simulator/run-simulator-redesigned";
import { BatchTestingPanel } from "@/components/simulator/batch/batch-testing-panel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

function SimulatorContent() {
  const searchParams = useSearchParams();
  // Role-scoped per Configuration Studio → Access → Product Access — default
  // allow-all until an admin explicitly restricts this role. A deep link to
  // a product outside this role's access falls back to the first accessible
  // product below, same as any other "not found" case already did.
  const products = useAccessibleProducts();

  const initialProductId = searchParams.get("productId") || (searchParams.get("domain") && products.find((p) => p.domain === searchParams.get("domain"))?.id) || products[0]?.id;
  const initialSandboxRule = searchParams.get("sandboxRule");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(
    () => products.find((p) => p.id === initialProductId) ?? products[0] ?? null
  );
  const [mode, setMode] = useState<"single" | "batch">("single");

  const sim = useRunSimulator(selectedProduct, initialSandboxRule);

  const handleProductChange = (product: Product) => {
    setSelectedProduct(product);
  };

  return (
    <div className="flex h-full flex-col">
      <Tabs value={mode} onValueChange={(v) => v && setMode(v as "single" | "batch")} className="flex min-h-0 flex-1 flex-col gap-0">
        <div className="flex items-center border-b bg-card px-4 pt-2.5 sm:px-5">
          <TabsList>
            <TabsTrigger value="single" className="gap-1.5"><FlaskConical className="size-3.5" /> Single Simulation</TabsTrigger>
            <TabsTrigger value="batch" className="gap-1.5"><FileSpreadsheet className="size-3.5" /> Batch Testing</TabsTrigger>
          </TabsList>
        </div>

        {/* Conditionally rendering only the active TabsContent (rather than
            leaving both mounted for Base UI's own hidden-panel toggle to
            manage) sidesteps a pre-existing issue where Tabs.Panel's
            unmount-on-close never completes without a CSS transition
            defined, leaving both panels visible/stacked — reproducible on
            the untouched Form View/JSON View tabs above, not introduced
            here. Safe because exactly one TabsContent is always rendered. */}
        {mode === "single" && (
          <TabsContent value="single" className="flex min-h-0 flex-1 flex-col">
            {selectedProduct ? (
              <RunSimulatorRedesigned
                product={selectedProduct}
                sim={sim}
                products={products}
                onProductChange={handleProductChange}
              />
            ) : null}
          </TabsContent>
        )}

        {mode === "batch" && selectedProduct && (
          <TabsContent value="batch" className="flex min-h-0 flex-1 flex-col">
            <BatchTestingPanel products={products} initialProduct={selectedProduct} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

export default function SimulatorPage() {
  return (
    <Suspense fallback={null}>
      <SimulatorContent />
    </Suspense>
  );
}
