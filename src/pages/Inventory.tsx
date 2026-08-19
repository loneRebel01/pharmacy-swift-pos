import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, AlertTriangle, ArrowDownCircle, ArrowUpCircle, Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function Inventory() {
  const products = useQuery(api.products.list);
  const inventory = useQuery(api.inventory.list);
  const adjustStock = useMutation(api.inventory.adjustStock);
  const [searchTerm, setSearchTerm] = useState("");
  const [adjustProduct, setAdjustProduct] = useState<Id<"products"> | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustType, setAdjustType] = useState<"stock_in" | "stock_out" | "adjustment">("adjustment");
  const [adjustNotes, setAdjustNotes] = useState("");

  const filtered = (products ?? []).filter((p) => {
    if (!searchTerm) return p.isActive;
    const t = searchTerm.toLowerCase();
    return p.isActive && (p.name.toLowerCase().includes(t) || p.code.toLowerCase().includes(t));
  });

  const handleAdjust = async () => {
    if (!adjustProduct) { toast.error("Select a product"); return; }
    const qty = adjustType === "stock_out" ? -Math.abs(adjustQty) : adjustType === "stock_in" ? Math.abs(adjustQty) : adjustQty;
    try {
      await adjustStock({ productId: adjustProduct, quantity: qty, type: adjustType, notes: adjustNotes });
      toast.success("Stock adjusted");
      setAdjustProduct(null); setAdjustQty(0); setAdjustNotes("");
    } catch (e) { toast.error(String(e)); }
  };

  const totalStock = filtered.reduce((sum, p) => sum + p.currentStock, 0);
  const lowStockCount = filtered.filter((p) => p.minimumStock !== undefined && p.currentStock <= p.minimumStock).length;
  const expiredCount = filtered.filter((p) => p.expiryDate && p.expiryDate <= new Date().toISOString().split("T")[0]).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="size-6" /> Inventory</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="nb-card-sm"><CardContent className="p-4 text-center">
          <p className="text-xs font-bold text-muted-foreground">Total Stock Units</p>
          <p className="text-2xl font-bold">{totalStock}</p>
        </CardContent></Card>
        <Card className="nb-card-sm"><CardContent className="p-4 text-center flex items-center justify-center gap-2">
          <AlertTriangle className="size-5 text-yellow-600" />
          <div><p className="text-xs font-bold text-muted-foreground">Low Stock Items</p><p className="text-2xl font-bold">{lowStockCount}</p></div>
        </CardContent></Card>
        <Card className="nb-card-sm"><CardContent className="p-4 text-center flex items-center justify-center gap-2">
          <AlertTriangle className="size-5 text-red-600" />
          <div><p className="text-xs font-bold text-muted-foreground">Expired Items</p><p className="text-2xl font-bold">{expiredCount}</p></div>
        </CardContent></Card>
      </div>

      {/* Search */}
      <Card className="nb-card-sm"><CardContent className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input type="text" placeholder="Search products..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="nb-input w-full pl-10 text-sm" autoFocus />
        </div>
      </CardContent></Card>

      {/* Stock Adjust */}
      <Card className="nb-card">
        <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase">Adjust Stock</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-bold">Product</label>
              <select value={adjustProduct ?? ""} onChange={(e) => setAdjustProduct((e.target.value || null) as Id<"products"> | null)} className="nb-input text-xs mt-1 w-full">
                <option value="">Select Product</option>
                {filtered.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.code}) — Stock: {p.currentStock}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold">Type</label>
              <select value={adjustType} onChange={(e) => setAdjustType(e.target.value as typeof adjustType)} className="nb-input text-xs mt-1 w-full">
                <option value="stock_in">Stock In</option>
                <option value="stock_out">Stock Out</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold">Quantity</label>
              <Input type="number" value={adjustQty} onChange={(e) => setAdjustQty(Number(e.target.value))} className="nb-input text-xs mt-1 w-24" />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="text-xs font-bold">Notes</label>
              <Input value={adjustNotes} onChange={(e) => setAdjustNotes(e.target.value)} className="nb-input text-xs mt-1" placeholder="Optional" />
            </div>
            <Button onClick={handleAdjust} className="nb-btn text-xs">
              <RefreshCw className="size-3 mr-1" /> Adjust
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stock List */}
      <Card className="nb-card"><CardContent className="p-0">
        <div className="overflow-auto max-h-[calc(100vh-400px)]">
          <table className="nb-table">
            <thead><tr><th>Code</th><th>Name</th><th>Category</th><th className="text-right">Current</th><th className="text-right">Min</th><th className="text-right">Max</th><th>Expiry</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No products found</td></tr>
              ) : filtered.map((p) => {
                const isExpired = p.expiryDate && p.expiryDate <= new Date().toISOString().split("T")[0];
                const isLow = p.minimumStock !== undefined && p.currentStock <= p.minimumStock;
                return (
                  <tr key={p._id} className={isExpired ? "bg-red-50" : isLow ? "bg-yellow-50" : ""}>
                    <td className="text-xs font-mono">{p.code}</td>
                    <td className="text-sm font-semibold">{p.name}</td>
                    <td className="text-xs">{p.category ?? "-"}</td>
                    <td className={`text-right font-bold ${isLow ? "text-destructive" : ""}`}>{p.currentStock}</td>
                    <td className="text-right text-xs">{p.minimumStock ?? "-"}</td>
                    <td className="text-right text-xs">{p.maximumStock ?? "-"}</td>
                    <td className={`text-xs ${isExpired ? "text-destructive font-bold" : ""}`}>{p.expiryDate ?? "-"}</td>
                    <td>
                      {isExpired ? <span className="nb-badge bg-red-100 text-destructive">Expired</span> :
                       isLow ? <span className="nb-badge bg-yellow-100">Low Stock</span> :
                       <span className="nb-badge bg-green-100">OK</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent></Card>
    </div>
  );
}
