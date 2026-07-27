"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAccessibleProducts } from "@/lib/store";
import { Product } from "@/lib/types";
import { useRunSimulator } from "@/components/simulator/run-simulator-panel";
import { RunSimulatorRedesigned } from "@/components/simulator/run-simulator-redesigned";

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

  const sim = useRunSimulator(selectedProduct, initialSandboxRule);

  const handleProductChange = (product: Product) => {
    setSelectedProduct(product);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col">
        {selectedProduct && (
          <RunSimulatorRedesigned
            product={selectedProduct}
            sim={sim}
            products={products}
            onProductChange={handleProductChange}
          />
        )}
      </div>
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
