import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownCircle, Search, Plus } from "lucide-react";
import { toast } from "sonner";

export default function StockIn() {
  const products = useQuery(api.products.list);
  const adjustStock = useMutation(api.inventory.adjustStock);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Id<"products"> | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [notes, setNotes] = useState("");

  const filtered = (products ?? []).filter((p) => {
    if (!searchTerm) return p.isActive;
    const t = searchTerm.toLowerCase();
    return p.isActive && (p.name.toLowerCase().includes(t) || p.code.toLowerCase().includes(t));
  });

  const handleSubmit = useCallback(async () => {
    if (!selectedProduct) { toast.error("Select a product"); return; }
    if (quantity <= 0) { toast.error("Enter a valid quantity"); return; }
    try {
      await adjustStock({ productId: selectedProduct, quantity, type: "stock_in", notes });
      toast.success("Stock added successfully");
      setSelectedProduct(null); setQuantity(0); setNotes(""); setSearchTerm("");
    } catch (e) { toast.error(String(e)); }
  }, [selectedProduct, quantity, notes, adjustStock]);

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold flex items-center gap-2"><ArrowDownCircle className="size-6 text-green-600" /> Stock In</h1>
      <Card className="nb-card-sm"><CardContent className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input type="text" placeholder="Search product..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="nb-input w-full pl-10 text-sm" autoFocus />
        </div>
        {searchTerm && (
          <div className="mt-2 border-2 border-border max-h-40 overflow-auto">
            {filtered.slice(0, 10).map((p) => (
              <div key={p._id} className={`px-3 py-2 text-xs flex justify-between cursor-pointer border-b border-border last:border-0 hover:bg-muted ${selectedProduct === p._id ? "bg-accent" : ""}`} onClick={() => { setSelectedProduct(p._id); setSearchTerm(p.name); }}>
                <span className="font-bold">{p.name}</span><span>Stock: {p.currentStock}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent></Card>
      <Card className="nb-card"><CardContent className="space-y-3 pt-4">
        <div><label className="text-xs font-bold">Quantity</label><Input type="number" value={quantity || ""} onChange={(e) => setQuantity(Number(e.target.value))} className="nb-input text-sm mt-1" min="1" /></div>
        <div><label className="text-xs font-bold">Notes</label><Input value={notes} onChange={(e) => setNotes(e.target.value)} className="nb-input text-sm mt-1" placeholder="Optional" /></div>
        <Button onClick={handleSubmit} className="nb-btn text-xs" disabled={!selectedProduct || quantity <= 0}><Plus className="size-3 mr-1" /> Add Stock</Button>
      </CardContent></Card>
    </div>
  );
}
