
const fs = require("fs");
let code = fs.readFileSync("src/components/studio/product-rule-mapping-manager.tsx", "utf8");

const oldSave = `      }
    saveProductRuleMapping(product.id, Array.from(activeSelection));
      setSelection(null);
      toast.success(\`Mapping saved — \${activeSelection.size} rule\${activeSelection.size === 1 ? "" : "s"} mapped to "\${product.name}".\`);`;
      
const newSave = `      }
      const res = saveProductRuleMapping(product.id, Array.from(activeSelection));
      if (res && !res.ok) {
        toast.error(res.reason);
        return;
      }
      setSelection(null);
      toast.success(\`Mapping saved — \${activeSelection.size} rule\${activeSelection.size === 1 ? "" : "s"} mapped to "\${product.name}".\`);`;

code = code.replace(oldSave, newSave);

const oldReorder = `    const reorderMapped = (orderedIds: string[]) => {
      if (!selectedProduct) return;
    saveProductRuleMapping(selectedProduct.id, orderedIds);
      toast.success("Execution sequence updated.");
    };`;
    
const newReorder = `    const reorderMapped = (orderedIds: string[]) => {
      if (!selectedProduct) return;
      const res = saveProductRuleMapping(selectedProduct.id, orderedIds);
      if (res && !res.ok) {
        toast.error(res.reason);
        return;
      }
      toast.success("Execution sequence updated.");
    };`;

code = code.replace(oldReorder, newReorder);

fs.writeFileSync("src/components/studio/product-rule-mapping-manager.tsx", code, "utf8");
console.log("Updated product-rule-mapping-manager.tsx");

