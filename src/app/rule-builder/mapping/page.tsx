import { Suspense } from "react";
import { MappingClient } from "./mapping-client";

export default function ProductMappingPage() {
  return (
    <div className="flex h-full flex-col bg-muted/30">
      <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading mapping context...</div>}>
        <MappingClient />
      </Suspense>
    </div>
  );
}
