"use client";

import { useState, useMemo } from "react";
import { Search, Package, Check, Star, Clock, Building2, ChevronDown } from "lucide-react";
import { Product } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ProductSelectorProps {
  products: Product[];
  selectedProduct: Product;
  onSelectProduct: (product: Product) => void;
  mappedRuleCount?: number;
}

export function ProductSelector({
  products,
  selectedProduct,
  onSelectProduct,
  mappedRuleCount = 0,
}: ProductSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>(["prod-home-loan", "prod-auto-loan"]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.domain.toLowerCase().includes(q)
    );
  }, [products, search]);

  const favoriteProducts = useMemo(
    () => products.filter((p) => favorites.includes(p.id)),
    [products, favorites]
  );

  const toggleFavorite = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-3.5 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Target Product Pipeline
        </label>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Building2 className="size-3.5" />
          <span className="font-medium text-foreground">{selectedProduct.domain}</span>
          <span>·</span>
          <span>{mappedRuleCount} Mapped Rules</span>
        </div>
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<Button variant="outline" size="sm" className="w-full justify-between h-10 px-3 border-border/80 bg-muted/20 font-medium" />}>
          <div className="flex items-center gap-2 min-w-0">
            <Package className="size-4 shrink-0 text-primary" />
            <span className="truncate font-semibold text-foreground">{selectedProduct.name}</span>
            <Badge
              variant={selectedProduct.status === "Active" ? "default" : "secondary"}
              className="h-5 text-[10px] px-1.5"
            >
              {selectedProduct.status}
            </Badge>
          </div>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </PopoverTrigger>

        <PopoverContent align="start" className="w-[380px] p-2 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product name, code or domain..."
              className="h-8 pl-8 text-xs"
            />
          </div>

          {/* Favorites quick row */}
          {favoriteProducts.length > 0 && !search && (
            <div className="space-y-1 pt-1">
              <p className="px-2 text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Star className="size-3 text-amber-500 fill-amber-500" /> Favorites
              </p>
              <div className="flex flex-wrap gap-1 px-1">
                {favoriteProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelectProduct(p);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors",
                      p.id === selectedProduct.id
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border bg-background hover:bg-accent"
                    )}
                  >
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="max-h-60 overflow-y-auto space-y-0.5 divide-y divide-border/40">
            {filteredProducts.map((p) => {
              const isFav = favorites.includes(p.id);
              const isSelected = p.id === selectedProduct.id;
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    onSelectProduct(p);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between px-2.5 py-2 text-xs rounded-md cursor-pointer transition-colors",
                    isSelected ? "bg-primary/10 font-medium text-foreground" : "hover:bg-accent/60"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-foreground">{p.name}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Domain: {p.domain}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isSelected && <Check className="size-3.5 text-primary" />}
                    <button
                      onClick={(e) => toggleFavorite(e, p.id)}
                      className="p-1 text-muted-foreground hover:text-amber-500 transition-colors"
                      title={isFav ? "Remove favorite" : "Add favorite"}
                    >
                      <Star className={cn("size-3.5", isFav && "fill-amber-500 text-amber-500")} />
                    </button>
                  </div>
                </div>
              );
            })}
            {filteredProducts.length === 0 && (
              <p className="p-4 text-center text-xs text-muted-foreground">No products match your search.</p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
