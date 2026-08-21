import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RotateCcw,
  Search,
  Trash2,
  Save,
  CheckCircle,
  Package,
  ArrowRightLeft,
} from "lucide-react";
import { toast } from "sonner";

interface ReturnItem {
  productId: Id<"products">;
  productName: string;
  unit: string;
  quantity: number;
  purchasePrice: number;
  retailPrice: number;
  salePrice: number;
  cost: number;
  margin: number;
  marginPercent: number;
  discount: number;
  extraDiscount: number;
  taxPercent: number;
  taxAmount: number;
  netRate: number;
  total: number;
  batchNumber: string;
  expiryDate: string;
  barcode: string;
}

function recalcReturnItem(item: ReturnItem): ReturnItem {
  const sub = item.salePrice * item.quantity;
  const taxAmt = (sub * item.taxPercent) / 100;
  const finalTotal = sub - item.discount - item.extraDiscount + taxAmt;
  const cost = item.purchasePrice * item.quantity;
  const margin = finalTotal - cost;
  const marginPercent = finalTotal > 0 ? (margin / finalTotal) * 100 : 0;
  return {
    ...item,
    taxAmount: taxAmt,
    total: finalTotal,
    netRate: item.quantity > 0 ? finalTotal / item.quantity : item.salePrice,
    cost: item.quantity > 0 ? cost / item.quantity : item.purchasePrice,
    margin,
    marginPercent,
  };
}

type EditableCol = "quantity" | "salePrice" | "discount" | "extraDiscount" | "taxPercent";

export default function Returns() {
  const products = useQuery(api.products.list);
  const customers = useQuery(api.customers.list);
  const suppliers = useQuery(api.suppliers.list);
  const sales = useQuery(api.sales.list);
  const purchases = useQuery(api.purchases.list);
  const returnsList = useQuery(api.returns.list);
  const createReturn = useMutation(api.returns.create);
  const logActivity = useMutation(api.activityLogs.create);

  const [activeTab, setActiveTab] = useState<"sales" | "purchase">("sales");

  // Return items
  const [items, setItems] = useState<ReturnItem[]>([]);

  // Header fields
  const [customerId, setCustomerId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [originalInvoice, setOriginalInvoice] = useState("");
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");

  // Product search
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<NonNullable<typeof products>>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedResultIdx, setSelectedResultIdx] = useState(0);

  // Qty input
  const [qtyValue, setQtyValue] = useState("");
  const [showQty, setShowQty] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<NonNullable<typeof products>[number] | null>(null);

  // Cell editing
  const [editingCell, setEditingCell] = useState<{ row: number; col: EditableCol } | null>(null);
  const [editValue, setEditValue] = useState("");
  const cellInputRef = useRef<HTMLInputElement>(null);

  // History
  const [showHistory, setShowHistory] = useState(false);
  const [viewingReturn, setViewingReturn] = useState<Id<"returns"> | null>(null);
  const viewingItems = useQuery(
    api.returns.getItems,
    viewingReturn ? { returnId: viewingReturn } : "skip"
  );
  const viewingReturnData = useQuery(
    api.returns.get,
    viewingReturn ? { id: viewingReturn } : "skip"
  );

  const searchRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);

  // Search products
  useEffect(() => {
    if (!products) return;
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    const term = searchTerm.toLowerCase();
    const results = products.filter(
      (p) =>
        p.isActive &&
        (p.name.toLowerCase().includes(term) ||
          p.code.toLowerCase().includes(term) ||
          (p.barcode && p.barcode.toLowerCase().includes(term)) ||
          (p.genericName && p.genericName.toLowerCase().includes(term)) ||
          (p.brand && p.brand.toLowerCase().includes(term)) ||
          (p.batchNumber && p.batchNumber.toLowerCase().includes(term)))
    );
    setSearchResults(results);
    setShowResults(results.length > 0);
    setSelectedResultIdx(0);
  }, [searchTerm, products]);

  const selectProduct = useCallback((product: (typeof searchResults)[0]) => {
    setSelectedProduct(product);
    setSearchTerm("");
    setShowResults(false);
    setQtyValue("1");
    setShowQty(true);
    setTimeout(() => qtyRef.current?.focus(), 50);
  }, []);

  const addItem = useCallback(() => {
    if (!selectedProduct || !qtyValue) return;
    const qty = parseInt(qtyValue) || 1;
    const salePrice = activeTab === "sales" ? selectedProduct.retailPrice : selectedProduct.purchasePrice;
    const taxP = selectedProduct.tax ?? 0;
    const discountAmt = selectedProduct.discount ?? 0;

    const rawItem: ReturnItem = {
      productId: selectedProduct._id,
      productName: selectedProduct.name,
      unit: selectedProduct.unit,
      quantity: qty,
      purchasePrice: selectedProduct.purchasePrice,
      retailPrice: selectedProduct.retailPrice,
      salePrice,
      cost: selectedProduct.purchasePrice,
      margin: 0,
      marginPercent: 0,
      discount: discountAmt,
      extraDiscount: 0,
      taxPercent: taxP,
      taxAmount: 0,
      netRate: 0,
      total: 0,
      batchNumber: selectedProduct.batchNumber ?? "",
      expiryDate: selectedProduct.expiryDate ?? "",
      barcode: selectedProduct.barcode ?? "",
    };

    setItems((prev) => [...prev, recalcReturnItem(rawItem)]);
    setSelectedProduct(null);
    setShowQty(false);
    setQtyValue("");
    setSearchTerm("");
    setTimeout(() => searchRef.current?.focus(), 50);
  }, [selectedProduct, qtyValue, activeTab]);

  const removeItem = useCallback((idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // Cell editing
  const editableCols: EditableCol[] = ["quantity", "salePrice", "discount", "extraDiscount", "taxPercent"];

  const startEditing = useCallback(
    (row: number, col: EditableCol) => {
      const item = items[row];
      if (!item) return;
      let val: string;
      switch (col) {
        case "quantity": val = String(item.quantity); break;
        case "salePrice": val = String(item.salePrice); break;
        case "discount": val = String(item.discount); break;
        case "extraDiscount": val = String(item.extraDiscount); break;
        case "taxPercent": val = String(item.taxPercent); break;
      }
      setEditingCell({ row, col });
      setEditValue(val);
      setTimeout(() => cellInputRef.current?.focus(), 0);
    },
    [items]
  );

  const commitEdit = useCallback(() => {
    if (!editingCell) return;
    const numVal = parseFloat(editValue) || 0;
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[editingCell.row] };
      switch (editingCell.col) {
        case "quantity": item.quantity = Math.max(1, Math.round(numVal)); break;
        case "salePrice": item.salePrice = numVal; break;
        case "discount": item.discount = numVal; break;
        case "extraDiscount": item.extraDiscount = numVal; break;
        case "taxPercent": item.taxPercent = numVal; break;
      }
      updated[editingCell.row] = recalcReturnItem(item);
      return updated;
    });
    setEditingCell(null);
    setEditValue("");
  }, [editingCell, editValue]);

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue("");
    searchRef.current?.focus();
  }, []);

  const handleCellKeyDown = useCallback(
    (e: React.KeyboardEvent, row: number, col: EditableCol) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        commitEdit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        cancelEdit();
      } else if (e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        commitEdit();
        const colIdx = editableCols.indexOf(col);
        if (e.shiftKey) {
          if (colIdx > 0) {
            setTimeout(() => startEditing(row, editableCols[colIdx - 1]), 0);
          } else if (row > 0) {
            setTimeout(() => startEditing(row - 1, editableCols[editableCols.length - 1]), 0);
          }
        } else {
          if (colIdx < editableCols.length - 1) {
            setTimeout(() => startEditing(row, editableCols[colIdx + 1]), 0);
          } else if (row < items.length - 1) {
            setTimeout(() => startEditing(row + 1, editableCols[0]), 0);
          } else {
            searchRef.current?.focus();
          }
        }
      }
    },
    [commitEdit, cancelEdit, startEditing, items.length]
  );

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.salePrice * item.quantity, 0);
  const totalTax = items.reduce((sum, item) => sum + item.taxAmount, 0);
  const totalDiscount = items.reduce((sum, item) => sum + item.discount + item.extraDiscount, 0);
  const grandTotal = subtotal - totalDiscount + totalTax;

  // Handle save
  const handleComplete = useCallback(async () => {
    if (items.length === 0) {
      toast.error("Add at least one product to return");
      return;
    }
    try {
      await createReturn({
        returnType: activeTab === "sales" ? "sales_return" : "purchase_return",
        date: returnDate,
        customerId: (customerId || undefined) as Id<"customers"> | undefined,
        supplierId: (supplierId || undefined) as Id<"suppliers"> | undefined,
        originalInvoice: originalInvoice || undefined,
        totalAmount: grandTotal,
        subtotal,
        totalDiscount: totalDiscount || undefined,
        totalTax: totalTax || undefined,
        reason: reason || undefined,
        items,
      });
      await logActivity({
        action: `${activeTab === "sales" ? "Sales" : "Purchase"} Return created`,
        module: "returns",
        details: `Total: PKR ${grandTotal.toFixed(2)}`,
      });
      toast.success(`${activeTab === "sales" ? "Sales" : "Purchase"} Return completed!`);
      resetForm();
    } catch (e) {
      toast.error(String(e));
    }
  }, [
    items, activeTab, returnDate, customerId, supplierId, originalInvoice,
    grandTotal, subtotal, totalDiscount, totalTax, reason, createReturn, logActivity,
  ]);

  const resetForm = useCallback(() => {
    setItems([]);
    setCustomerId("");
    setSupplierId("");
    setOriginalInvoice("");
    setReturnDate(new Date().toISOString().split("T")[0]);
    setReason("");
    setSearchTerm("");
    setShowQty(false);
    setSelectedProduct(null);
    setEditingCell(null);
  }, []);

  // Keyboard shortcuts
  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setShowResults(false);
        setSearchTerm("");
        setShowQty(false);
        setSelectedProduct(null);
        return;
      }
      if (e.key === "ArrowDown" && showResults) {
        e.preventDefault();
        e.stopPropagation();
        setSelectedResultIdx((prev) => Math.min(prev + 1, searchResults.length - 1));
        return;
      }
      if (e.key === "ArrowUp" && showResults) {
        e.preventDefault();
        e.stopPropagation();
        setSelectedResultIdx((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === "Enter" && showResults && searchResults[selectedResultIdx]) {
        e.preventDefault();
        e.stopPropagation();
        selectProduct(searchResults[selectedResultIdx]);
        return;
      }
    },
    [showResults, searchResults, selectedResultIdx, selectProduct]
  );

  const handleQtyKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        addItem();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setShowQty(false);
        setSelectedProduct(null);
        setQtyValue("");
        searchRef.current?.focus();
      }
    },
    [addItem]
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <RotateCcw className="size-6" />
          Returns
        </h1>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowHistory(!showHistory)}
            className="nb-btn-outline text-xs"
          >
            <Package className="size-3 mr-1" />
            {showHistory ? "New Return" : "Return History"}
          </Button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => { setActiveTab("sales"); resetForm(); }}
          className={`nb-btn text-xs ${activeTab === "sales" ? "bg-accent" : ""}`}
        >
          <ArrowRightLeft className="size-3 mr-1" /> Sales Return
        </button>
        <button
          onClick={() => { setActiveTab("purchase"); resetForm(); }}
          className={`nb-btn text-xs ${activeTab === "purchase" ? "bg-accent" : ""}`}
        >
          <ArrowRightLeft className="size-3 mr-1" /> Purchase Return
        </button>
      </div>

      {showHistory ? (
        /* ============ RETURN HISTORY ============ */
        <Card className="nb-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase">Return History</CardTitle>
          </CardHeader>
          <CardContent>
            {viewingReturn && viewingItems && viewingReturnData ? (
              <div className="space-y-3">
                <Button onClick={() => setViewingReturn(null)} className="nb-btn-outline text-xs mb-2">
                  ← Back to History
                </Button>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div><span className="font-bold">Return #:</span> {viewingReturnData.returnNumber}</div>
                  <div><span className="font-bold">Type:</span> {viewingReturnData.returnType === "sales_return" ? "Sales Return" : "Purchase Return"}</div>
                  <div><span className="font-bold">Date:</span> {viewingReturnData.date}</div>
                  {viewingReturnData.originalInvoice && <div><span className="font-bold">Invoice:</span> {viewingReturnData.originalInvoice}</div>}
                  <div><span className="font-bold">Total:</span> PKR {viewingReturnData.totalAmount.toFixed(2)}</div>
                  <div><span className="font-bold">Status:</span> {viewingReturnData.status}</div>
                  {viewingReturnData.reason && <div className="col-span-3"><span className="font-bold">Reason:</span> {viewingReturnData.reason}</div>}
                </div>
                <div className="overflow-auto">
                  <table className="nb-table text-xs">
                    <thead>
                      <tr>
                        <th>#</th><th>Product</th><th className="text-right">Qty</th>
                        <th className="text-right">Price</th><th className="text-right">Disc</th>
                        <th className="text-right">Tax%</th><th className="text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingItems.map((item, idx) => (
                        <tr key={item._id}>
                          <td>{idx + 1}</td>
                          <td className="font-semibold">{item.productName}</td>
                          <td className="text-right">{item.quantity}</td>
                          <td className="text-right">{item.salePrice.toFixed(2)}</td>
                          <td className="text-right">{(item.discount ?? 0).toFixed(2)}</td>
                          <td className="text-right">{item.taxPercent ?? 0}%</td>
                          <td className="text-right font-bold">PKR {item.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {(!returnsList || returnsList.length === 0) ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No returns recorded yet.</p>
                ) : (
                  <div className="overflow-auto">
                    <table className="nb-table text-xs">
                      <thead>
                        <tr>
                          <th>Return #</th>
                          <th>Type</th>
                          <th>Date</th>
                          <th>Invoice</th>
                          <th className="text-right">Amount</th>
                          <th>Status</th>
                          <th className="w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {returnsList.map((ret) => (
                          <tr key={ret._id}>
                            <td className="font-semibold">{ret.returnNumber}</td>
                            <td>
                              <span className={`nb-badge text-[10px] ${ret.returnType === "sales_return" ? "bg-blue-100" : "bg-orange-100"}`}>
                                {ret.returnType === "sales_return" ? "Sales" : "Purchase"}
                              </span>
                            </td>
                            <td>{ret.date}</td>
                            <td>{ret.originalInvoice || "—"}</td>
                            <td className="text-right font-bold">PKR {ret.totalAmount.toFixed(2)}</td>
                            <td>{ret.status}</td>
                            <td>
                              <button
                                onClick={() => setViewingReturn(ret._id)}
                                className="p-1 hover:bg-accent text-xs"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* ============ NEW RETURN ============ */
        <div className="flex gap-4" onKeyDown={handleSearchKeyDown}>
          {/* Left: Header + Search + Table */}
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            {/* Header Fields */}
            <Card className="nb-card-sm">
              <CardContent className="p-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="font-bold block mb-1">Date</label>
                    <input
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="nb-input text-xs w-full"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Original Invoice #</label>
                    <input
                      type="text"
                      value={originalInvoice}
                      onChange={(e) => setOriginalInvoice(e.target.value)}
                      placeholder="Invoice number"
                      className="nb-input text-xs w-full"
                    />
                  </div>
                  {activeTab === "sales" ? (
                    <div>
                      <label className="font-bold block mb-1">Customer</label>
                      <select
                        value={customerId}
                        onChange={(e) => setCustomerId(e.target.value)}
                        className="nb-input text-xs w-full"
                      >
                        <option value="">Select Customer</option>
                        {(customers ?? []).map((c) => (
                          <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="font-bold block mb-1">Supplier</label>
                      <select
                        value={supplierId}
                        onChange={(e) => setSupplierId(e.target.value)}
                        className="nb-input text-xs w-full"
                      >
                        <option value="">Select Supplier</option>
                        {(suppliers ?? []).map((s) => (
                          <option key={s._id} value={s._id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="font-bold block mb-1">Reason</label>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Return reason"
                      className="nb-input text-xs w-full"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product Search */}
            <Card className="nb-card-sm">
              <CardContent className="p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search product by name, code, barcode, batch..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    className="nb-input w-full pl-10 text-sm"
                    autoFocus
                  />
                </div>

                {/* Search Results */}
                {showResults && searchResults.length > 0 && (
                  <div className="mt-2 border-2 border-border bg-card max-h-40 overflow-auto">
                    {searchResults.slice(0, 10).map((product, idx) => (
                      <div
                        key={product._id}
                        className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer border-b border-border last:border-0
                          ${idx === selectedResultIdx ? "bg-accent" : "hover:bg-muted"}`}
                        onClick={() => selectProduct(product)}
                        onMouseEnter={() => setSelectedResultIdx(idx)}
                      >
                        <div>
                          <span className="font-bold">{product.name}</span>
                          <span className="ml-2 text-muted-foreground">{product.code}</span>
                          {product.brand && <span className="ml-2 text-muted-foreground">{product.brand}</span>}
                        </div>
                        <div className="flex gap-3">
                          <span>Stock: <b>{product.currentStock}</b></span>
                          <span className="font-bold">PKR {activeTab === "sales" ? product.retailPrice : product.purchasePrice}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quantity Input */}
                {showQty && selectedProduct && (
                  <div className="mt-2 p-3 bg-muted border-2 border-border">
                    <p className="text-xs font-bold mb-1">
                      {selectedProduct.name} — <span className="font-mono">{selectedProduct.code}</span>
                      <span className="ml-2">PKR {activeTab === "sales" ? selectedProduct.retailPrice : selectedProduct.purchasePrice}</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold">Qty:</label>
                      <input
                        ref={qtyRef}
                        type="number"
                        value={qtyValue}
                        onChange={(e) => setQtyValue(e.target.value)}
                        onKeyDown={handleQtyKeyDown}
                        className="nb-input text-sm w-24"
                        autoFocus
                        min="1"
                      />
                      <Button onClick={addItem} className="nb-btn text-xs">Add</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Return Table */}
            <Card className="nb-card flex-1 overflow-hidden flex flex-col">
              <CardContent className="p-0 flex-1 overflow-auto">
                <table className="nb-table text-xs">
                  <thead>
                    <tr>
                      <th className="w-8">#</th>
                      <th>Product</th>
                      <th>Unit</th>
                      <th className="text-right">Qty</th>
                      {activeTab === "purchase" && <th className="text-right">Pur.Price</th>}
                      <th className="text-right">{activeTab === "sales" ? "Price" : "Retail"}</th>
                      <th className="text-right">Disc</th>
                      {activeTab === "purchase" && <th className="text-right">X.Disc</th>}
                      <th className="text-right">Tax%</th>
                      <th className="text-right">Tax Amt</th>
                      {activeTab === "purchase" && <th className="text-right">Margin</th>}
                      {activeTab === "purchase" && <th className="text-right">Mgn%</th>}
                      <th className="text-right">Net Rate</th>
                      <th className="text-right">Total</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={activeTab === "purchase" ? 14 : 10}
                          className="text-center py-12 text-muted-foreground"
                        >
                          <RotateCcw className="size-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">Search and add products for return</p>
                        </td>
                      </tr>
                    ) : (
                      items.map((item, idx) => (
                        <tr key={idx} className={editingCell?.row === idx ? "bg-accent/30" : ""}>
                          <td>{idx + 1}</td>
                          <td className="font-semibold">{item.productName}</td>
                          <td>{item.unit}</td>
                          {/* Qty */}
                          <td className="text-right">
                            {editingCell?.row === idx && editingCell.col === "quantity" ? (
                              <input
                                ref={cellInputRef}
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => handleCellKeyDown(e, idx, "quantity")}
                                onBlur={() => commitEdit()}
                                className="nb-input text-xs w-16 text-right p-1 h-6"
                                autoFocus
                                min="1"
                              />
                            ) : (
                              <span
                                className="cursor-pointer hover:bg-accent px-1 inline-block min-w-[2rem]"
                                onClick={() => startEditing(idx, "quantity")}
                              >
                                {item.quantity}
                              </span>
                            )}
                          </td>
                          {/* Purchase Price (purchase return only) */}
                          {activeTab === "purchase" && (
                            <td className="text-right">{item.purchasePrice.toFixed(2)}</td>
                          )}
                          {/* Sale Price / Retail */}
                          <td className="text-right">
                            {editingCell?.row === idx && editingCell.col === "salePrice" ? (
                              <input
                                ref={cellInputRef}
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => handleCellKeyDown(e, idx, "salePrice")}
                                onBlur={() => commitEdit()}
                                className="nb-input text-xs w-20 text-right p-1 h-6"
                                autoFocus
                              />
                            ) : (
                              <span
                                className="cursor-pointer hover:bg-accent px-1 inline-block"
                                onClick={() => startEditing(idx, "salePrice")}
                              >
                                {item.salePrice.toFixed(2)}
                              </span>
                            )}
                          </td>
                          {/* Discount */}
                          <td className="text-right">
                            {editingCell?.row === idx && editingCell.col === "discount" ? (
                              <input
                                ref={cellInputRef}
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => handleCellKeyDown(e, idx, "discount")}
                                onBlur={() => commitEdit()}
                                className="nb-input text-xs w-16 text-right p-1 h-6"
                                autoFocus
                              />
                            ) : (
                              <span
                                className="cursor-pointer hover:bg-accent px-1 inline-block"
                                onClick={() => startEditing(idx, "discount")}
                              >
                                {item.discount.toFixed(2)}
                              </span>
                            )}
                          </td>
                          {/* Extra Discount (purchase return only) */}
                          {activeTab === "purchase" && (
                            <td className="text-right">
                              {editingCell?.row === idx && editingCell.col === "extraDiscount" ? (
                                <input
                                  ref={cellInputRef}
                                  type="number"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => handleCellKeyDown(e, idx, "extraDiscount")}
                                  onBlur={() => commitEdit()}
                                  className="nb-input text-xs w-16 text-right p-1 h-6"
                                  autoFocus
                                />
                              ) : (
                                <span
                                  className="cursor-pointer hover:bg-accent px-1 inline-block"
                                  onClick={() => startEditing(idx, "extraDiscount")}
                                >
                                  {item.extraDiscount.toFixed(2)}
                                </span>
                              )}
                            </td>
                          )}
                          {/* Tax % */}
                          <td className="text-right">
                            {editingCell?.row === idx && editingCell.col === "taxPercent" ? (
                              <input
                                ref={cellInputRef}
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => handleCellKeyDown(e, idx, "taxPercent")}
                                onBlur={() => commitEdit()}
                                className="nb-input text-xs w-14 text-right p-1 h-6"
                                autoFocus
                              />
                            ) : (
                              <span
                                className="cursor-pointer hover:bg-accent px-1 inline-block"
                                onClick={() => startEditing(idx, "taxPercent")}
                              >
                                {item.taxPercent}%
                              </span>
                            )}
                          </td>
                          {/* Tax Amount */}
                          <td className="text-right">{item.taxAmount.toFixed(2)}</td>
                          {/* Margin + Margin% (purchase return only) */}
                          {activeTab === "purchase" && (
                            <>
                              <td className={`text-right font-semibold ${item.margin >= 0 ? "text-green-700" : "text-destructive"}`}>
                                {item.margin.toFixed(2)}
                              </td>
                              <td className="text-right">{item.marginPercent.toFixed(1)}%</td>
                            </>
                          )}
                          {/* Net Rate */}
                          <td className="text-right">{item.netRate.toFixed(2)}</td>
                          {/* Total */}
                          <td className="text-right font-bold">PKR {item.total.toFixed(2)}</td>
                          <td>
                            <button onClick={() => removeItem(idx)} className="p-1 hover:bg-destructive/10">
                              <Trash2 className="size-3 text-destructive" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {/* Right: Summary */}
          <div className="w-72 shrink-0 space-y-3 hidden lg:block">
            <Card className="nb-card-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase">
                  {activeTab === "sales" ? "Sales" : "Purchase"} Return Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-bold">Subtotal</span>
                  <span>PKR {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-bold">Discount</span>
                  <span className="text-destructive">-PKR {totalDiscount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-bold">Tax</span>
                  <span>PKR {totalTax.toFixed(2)}</span>
                </div>
                <div className="border-t-2 border-border pt-2 flex justify-between text-lg font-bold">
                  <span>TOTAL</span>
                  <span>PKR {grandTotal.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleComplete}
              className="nb-btn w-full text-sm py-3"
              disabled={items.length === 0}
            >
              <CheckCircle className="size-4 mr-2" />
              Complete Return — PKR {grandTotal.toFixed(2)}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
