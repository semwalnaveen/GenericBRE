import { Suspense } from "react";
import { RuleViewClient } from "./rule-view-client";

export default function RuleViewPage() {
  return (
    <div className="flex h-full flex-col">
      <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading rule...</div>}>
        <RuleViewClient />
      </Suspense>
    </div>
  );
}
