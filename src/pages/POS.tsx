import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ShoppingCartIcon,
  Search,
  Trash2,
  Save,
  Printer,
  Pause,
  X,
  CreditCard,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";

interface SaleItem {
  productId: Id<"products">;
  productName: string;
  unit: string;
  quantity: number;
  retailPrice: number;
  purchasePrice: number;
  salePrice: number;
  discount: number;
  extraDiscount: number;
  taxPercent: number;
  taxAmount: number;
  margin: number;
  marginPercent: number;
  total: number;
  netRate: number;
  batchNumber: string;
  expiryDate: string;
}

function recalcItem(item: SaleItem): SaleItem {
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
    margin,
    marginPercent,
  };
}

// Editable cell column keys
type EditableCol = "quantity" | "salePrice" | "discount" | "taxPercent";

export default function POS() {
  const products = useQuery(api.products.list);
  const customers = useQuery(api.customers.list);
  const saleList = useQuery(api.sales.list);
  const heldSales = useQuery(api.sales.getHeld);
  const createSale = useMutation(api.sales.create);
  const holdSale = useMutation(api.sales.hold);
  const removeHeld = useMutation(api.sales.removeHeld);
  const logActivity = useMutation(api.activityLogs.create);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<typeof products extends (infer T)[] | undefined ? T[] : never>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedResultIdx, setSelectedResultIdx] = useState(0);

  const [qtyValue, setQtyValue] = useState("");
  const [showQty, setShowQty] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<NonNullable<typeof products>[number] | null>(null);

  // Sale header
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashReceived, setCashReceived] = useState(0);
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<SaleItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  // Cell editing state
  const [editingCell, setEditingCell] = useState<{ row: number; col: EditableCol } | null>(null);
  const [editValue, setEditValue] = useState("");
  const cellInputRef = useRef<HTMLInputElement>(null);

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
        p.currentStock > 0 &&
        (p.name.toLowerCase().includes(term) ||
          p.code.toLowerCase().includes(term) ||
          (p.barcode && p.barcode.toLowerCase().includes(term)) ||
          (p.genericName && p.genericName.toLowerCase().includes(term)) ||
          (p.brand && p.brand.toLowerCase().includes(term)))
    );
    setSearchResults(results);
    setShowResults(results.length > 0);
    setSelectedResultIdx(0);
  }, [searchTerm, products]);

  const selectProduct = useCallback((product: typeof searchResults[0]) => {
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
    const salePrice = selectedProduct.retailPrice;
    const taxP = selectedProduct.tax ?? 0;
    const discountAmt = selectedProduct.discount ?? 0;

    const rawItem: SaleItem = {
      productId: selectedProduct._id,
      productName: selectedProduct.name,
      unit: selectedProduct.unit,
      quantity: qty,
      retailPrice: selectedProduct.retailPrice,
      purchasePrice: selectedProduct.purchasePrice,
      salePrice,
      discount: discountAmt,
      extraDiscount: 0,
      taxPercent: taxP,
      taxAmount: 0,
      margin: 0,
      marginPercent: 0,
      total: 0,
      netRate: 0,
      batchNumber: selectedProduct.batchNumber ?? "",
      expiryDate: selectedProduct.expiryDate ?? "",
    };

    const newItem = recalcItem(rawItem);
    setItems((prev) => [...prev, newItem]);
    setSelectedProduct(null);
    setShowQty(false);
    setQtyValue("");
    setSearchTerm("");
    setTimeout(() => searchRef.current?.focus(), 50);
  }, [selectedProduct, qtyValue]);

  const removeItem = useCallback((idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // Cell editing helpers
  const startEditing = useCallback((row: number, col: EditableCol) => {
    const item = items[row];
    if (!item) return;
    let val: string;
    switch (col) {
      case "quantity": val = String(item.quantity); break;
      case "salePrice": val = String(item.salePrice); break;
      case "discount": val = String(item.discount); break;
      case "taxPercent": val = String(item.taxPercent); break;
    }
    setEditingCell({ row, col });
    setEditValue(val);
    setTimeout(() => cellInputRef.current?.focus(), 0);
  }, [items]);

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
        case "taxPercent": item.taxPercent = numVal; break;
      }
      updated[editingCell.row] = recalcItem(item);
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

  // Table keyboard navigation
  const editableCols: EditableCol[] = ["quantity", "salePrice", "discount", "taxPercent"];

  const handleCellKeyDown = useCallback((e: React.KeyboardEvent, row: number, col: EditableCol) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    } else if (e.key === "Tab") {
      e.preventDefault();
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
  }, [commitEdit, cancelEdit, startEditing, items.length]);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.salePrice * item.quantity, 0);
  const totalTax = items.reduce((sum, item) => sum + item.taxAmount, 0);
  const totalDiscount = items.reduce((sum, item) => sum + item.discount + item.extraDiscount, 0);
  const grandTotal = subtotal - totalDiscount + totalTax;
  const change = cashReceived > grandTotal ? cashReceived - grandTotal : 0;

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowResults(false);
        setSearchTerm("");
        setShowQty(false);
        setSelectedProduct(null);
        return;
      }
      if (e.key === "ArrowDown" && showResults) {
        e.preventDefault();
        setSelectedResultIdx((prev) => Math.min(prev + 1, searchResults.length - 1));
        return;
      }
      if (e.key === "ArrowUp" && showResults) {
        e.preventDefault();
        setSelectedResultIdx((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === "Enter" && showResults && searchResults[selectedResultIdx]) {
        e.preventDefault();
        selectProduct(searchResults[selectedResultIdx]);
        return;
      }
      if (e.key === "p" && e.ctrlKey) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (e.key === "s" && e.ctrlKey) {
        e.preventDefault();
        setShowPayment(true);
        return;
      }
      if (e.key === "P" && e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        handlePrint();
        return;
      }
      if (e.key === "h" && e.ctrlKey) {
        e.preventDefault();
        handleHold();
        return;
      }
      if (e.key === "r" && e.ctrlKey) {
        e.preventDefault();
        if (heldSales && heldSales.length > 0) handleResumeHeld(heldSales[0]);
        return;
      }
      if (e.key === "d" && e.ctrlKey && items.length > 0) {
        e.preventDefault();
        removeItem(items.length - 1);
        toast.info("Last item removed");
        return;
      }
    },
    [showResults, searchResults, selectedResultIdx, selectProduct, items, heldSales, removeItem]
  );

  const handleQtyKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addItem();
      }
      if (e.key === "Escape") {
        setShowQty(false);
        setSelectedProduct(null);
        setQtyValue("");
        searchRef.current?.focus();
      }
    },
    [addItem]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "p" && e.ctrlKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "s" && e.ctrlKey) {
        e.preventDefault();
        setShowPayment(true);
      }
      if (e.key === "P" && e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        handlePrint();
      }
      if (e.key === "h" && e.ctrlKey) {
        e.preventDefault();
        handleHold();
      }
      if (e.key === "d" && e.ctrlKey && items.length > 0) {
        e.preventDefault();
        removeItem(items.length - 1);
        toast.info("Last item removed");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [items, removeItem]);

  const handleSave = useCallback(async (method?: string) => {
    if (items.length === 0) {
      toast.error("Add at least one product");
      return;
    }
    const payMethod = method || paymentMethod;
    const now = new Date();
    const invNum = `SALE-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`;
    try {
      await createSale({
        customerId: (customerId || undefined) as Id<"customers"> | undefined,
        invoiceNumber: invNum,
        date: now.toISOString().split("T")[0],
        paymentMethod: payMethod,
        subtotal,
        totalDiscount: totalDiscount || undefined,
        totalTax: totalTax || undefined,
        totalAmount: grandTotal,
        cashReceived: payMethod === "cash" ? cashReceived : undefined,
        changeReturned: payMethod === "cash" ? change : undefined,
        notes: notes || undefined,
        items,
      });
      await logActivity({ action: "Sale created", module: "sales", details: invNum });
      toast.success(`Sale saved! Invoice: ${invNum}`);
      resetForm();
      setShowPayment(false);
    } catch (e) {
      toast.error(String(e));
    }
  }, [items, customerId, paymentMethod, cashReceived, grandTotal, subtotal, totalDiscount, totalTax, change, notes, createSale, logActivity]);

  const handleHold = useCallback(async () => {
    if (items.length === 0) {
      toast.error("No items to hold");
      return;
    }
    try {
      await holdSale({
        data: { items, customerId, grandTotal, subtotal, totalDiscount, totalTax },
      });
      toast.success("Sale held");
    } catch (e) {
      toast.error(String(e));
    }
  }, [items, customerId, grandTotal, subtotal, totalDiscount, totalTax, holdSale]);

  const handleResumeHeld = useCallback(
    async (held: typeof heldSales extends (infer T)[] | undefined ? T : never) => {
      const data = held.data;
      if (data.items) setItems(data.items);
      if (data.customerId) setCustomerId(data.customerId);
      await removeHeld({ id: held._id });
      toast.success("Sale resumed");
    },
    [removeHeld]
  );

  const handlePrint = useCallback(() => {
    const printContent = `
      <html><head><title>Receipt</title>
      <style>
        body{font-family:'Courier New',monospace;font-size:11px;margin:10px;}
        .receipt{max-width:80mm;margin:0 auto;}
        .header{text-align:center;border-bottom:2px dashed #000;padding-bottom:8px;margin-bottom:8px;}
        table{width:100%;margin:6px 0;}
        td{padding:2px 0;font-size:10px;}
        .line{border-top:1px dashed #000;margin:6px 0;}
        .total{text-align:right;font-weight:bold;font-size:13px;border-top:2px solid #000;padding-top:4px;margin-top:8px;}
        .footer{text-align:center;margin-top:12px;font-size:9px;}
      </style></head><body>
      <div class="receipt">
        <div class="header">
          <h2 style="margin:0;">FREE BUFF PHARMACY</h2>
          <p style="margin:2px 0;">Medical & General Store</p>
          <p style="margin:2px 0;">Phone: 0300-1234567</p>
          <p style="margin:2px 0;">Invoice: ${items.length > 0 ? "SALE-" + Date.now() : "N/A"}</p>
          <p style="margin:2px 0;">Date: ${new Date().toLocaleString()}</p>
        </div>
        ${items.map((item) => `<div style="display:flex;justify-content:space-between;">
          <span>${item.productName} x${item.quantity}</span>
          <span>PKR ${item.total.toFixed(2)}</span>
        </div>`).join("")}
        <div class="line"></div>
        <div class="total">
          <div>Subtotal: PKR ${subtotal.toFixed(2)}</div>
          ${totalDiscount > 0 ? `<div>Discount: -PKR ${totalDiscount.toFixed(2)}</div>` : ""}
          ${totalTax > 0 ? `<div>Tax: PKR ${totalTax.toFixed(2)}</div>` : ""}
          <div style="font-size:15px;margin-top:4px;">TOTAL: PKR ${grandTotal.toFixed(2)}</div>
        </div>
        <div class="line"></div>
        <div style="display:flex;justify-content:space-between;font-size:10px;">
          <span>Cash Received: PKR ${(cashReceived || grandTotal).toFixed(2)}</span>
          ${change > 0 ? `<span>Change: PKR ${change.toFixed(2)}</span>` : ""}
        </div>
        <div class="footer">
          <p>Thank you for your purchase!</p>
          <p>Get well soon 🙏</p>
        </div>
      </div>
      </body></html>
    `;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(printContent);
      w.document.close();
      w.print();
    }
  }, [items, subtotal, totalTax, totalDiscount, grandTotal, cashReceived, change]);

  const resetForm = useCallback(() => {
    setItems([]);
    setCustomerId("");
    setPaymentMethod("cash");
    setCashReceived(0);
    setNotes("");
    setSearchTerm("");
    setShowQty(false);
    setSelectedProduct(null);
    setEditingCell(null);
  }, []);

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-4" onKeyDown={handleSearchKeyDown}>
      {/* Left: Product Search + Table */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCartIcon className="size-6" />
            POS / Sales
          </h1>
          <div className="flex gap-2">
            <Button onClick={handleHold} className="nb-btn-accent text-xs">
              <Pause className="size-3 mr-1" /> Hold
            </Button>
            <Button onClick={() => setShowPayment(true)} className="nb-btn text-xs">
              <Save className="size-3 mr-1" /> Pay
            </Button>
            <Button onClick={handlePrint} className="nb-btn-outline text-xs">
              <Printer className="size-3 mr-1" /> Print
            </Button>
          </div>
        </div>

        {/* Held Sales */}
        {heldSales && heldSales.length > 0 && (
          <Card className="nb-card-sm border-yellow-400">
            <CardContent className="p-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold">Held ({heldSales.length}):</span>
                {heldSales.map((held) => (
                  <Button
                    key={held._id}
                    onClick={() => handleResumeHeld(held)}
                    className="nb-btn-accent text-[10px] py-0 px-2"
                  >
                    Resume
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <Card className="nb-card-sm">
          <CardContent className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Scan barcode or search product (Ctrl+F)..."
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
                      <span className="font-bold">PKR {product.retailPrice}</span>
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
                  <span className="ml-2">PKR {selectedProduct.retailPrice}</span>
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
                  <span className="text-[10px] text-muted-foreground">
                    = PKR {((selectedProduct.retailPrice * (parseInt(qtyValue) || 1))).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* POS Table */}
        <Card className="nb-card flex-1 overflow-hidden flex flex-col">
          <CardContent className="p-0 flex-1 overflow-auto">
            <table className="nb-table">
              <thead>
                <tr>
                  <th className="w-8">#</th>
                  <th>Product</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Disc</th>
                  <th className="text-right">Tax%</th>
                  <th className="text-right">Tax Amt</th>
                  <th className="text-right">Margin</th>
                  <th className="text-right">Total</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-muted-foreground">
                      <ShoppingCartIcon className="size-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Scan barcode or search to add products</p>
                      <p className="text-[10px] mt-1 font-mono">Ctrl+F to search | Ctrl+H to hold</p>
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={idx} className={editingCell?.row === idx ? "bg-accent/30" : ""}>
                      <td className="text-xs">{idx + 1}</td>
                      <td className="font-semibold text-xs">{item.productName}</td>
                      {/* Qty */}
                      <td className="text-right text-xs">
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
                            title="Click or press Enter to edit"
                          >
                            {item.quantity}
                          </span>
                        )}
                      </td>
                      {/* Price */}
                      <td className="text-right text-xs">
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
                            title="Click or press Enter to edit"
                          >
                            {item.salePrice.toFixed(2)}
                          </span>
                        )}
                      </td>
                      {/* Discount */}
                      <td className="text-right text-xs">
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
                            title="Click or press Enter to edit"
                          >
                            {item.discount.toFixed(2)}
                          </span>
                        )}
                      </td>
                      {/* Tax % */}
                      <td className="text-right text-xs">
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
                            title="Click or press Enter to edit"
                          >
                            {item.taxPercent}%
                          </span>
                        )}
                      </td>
                      {/* Tax Amount (computed, read-only) */}
                      <td className="text-right text-xs">{item.taxAmount.toFixed(2)}</td>
                      {/* Margin (computed, read-only) */}
                      <td className={`text-right text-xs font-semibold ${item.margin >= 0 ? "text-green-700" : "text-destructive"}`}>
                        {item.margin.toFixed(2)}
                      </td>
                      {/* Total */}
                      <td className="text-right text-xs font-bold">PKR {item.total.toFixed(2)}</td>
                      <td>
                        <button
                          onClick={() => removeItem(idx)}
                          className="p-1 hover:bg-destructive/10"
                        >
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

      {/* Right: Summary + Customer */}
      <div className="w-72 shrink-0 space-y-3 hidden lg:block">
        {/* Customer */}
        <Card className="nb-card-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase">Customer</CardTitle>
          </CardHeader>
          <CardContent>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="nb-input text-xs w-full">
              <option value="">Walk-in Customer</option>
              {(customers ?? []).map((c) => (
                <option key={c._id} value={c._id}>{c.name} ({c.mobile ?? "N/A"})</option>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card className="nb-card-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase">Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {["cash", "card", "credit"].map((m) => (
                <button
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  className={`nb-btn-outline text-xs py-2 flex flex-col items-center gap-1
                    ${paymentMethod === m ? "bg-accent" : ""}`}
                >
                  {m === "cash" && <Banknote className="size-4" />}
                  {m === "card" && <CreditCard className="size-4" />}
                  {m === "credit" && <X className="size-4" />}
                  <span className="text-[10px] font-bold uppercase">{m}</span>
                </button>
              ))}
            </div>
            {paymentMethod === "cash" && (
              <div>
                <label className="text-xs font-bold">Cash Received</label>
                <Input
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(Number(e.target.value))}
                  className="nb-input text-sm mt-1"
                  placeholder="0"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Totals */}
        <Card className="nb-card">
          <CardContent className="space-y-2 p-3">
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
            {paymentMethod === "cash" && cashReceived > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="font-bold">Cash</span>
                  <span>PKR {cashReceived.toFixed(2)}</span>
                </div>
                {change > 0 && (
                  <div className="flex justify-between text-sm font-bold text-green-700">
                    <span>Change</span>
                    <span>PKR {change.toFixed(2)}</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Button onClick={() => setShowPayment(true)} className="nb-btn w-full text-sm py-3">
          <CreditCard className="size-4 mr-2" />
          Complete Sale — PKR {grandTotal.toFixed(2)}
        </Button>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) setShowPayment(false); }}>
          <Card className="nb-card w-full max-w-md mx-4">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold uppercase">Complete Payment</CardTitle>
              <button onClick={() => setShowPayment(false)} className="p-1 hover:bg-muted">
                <X className="size-4" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 bg-muted border-2 border-border">
                <p className="text-xs font-bold text-muted-foreground">Total Amount</p>
                <p className="text-3xl font-bold">PKR {grandTotal.toFixed(2)}</p>
              </div>
              <div>
                <label className="text-xs font-bold">Customer</label>
                <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="nb-input text-xs w-full mt-1">
                  <option value="">Walk-in Customer</option>
                  {(customers ?? []).map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold">Payment Method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="nb-input text-xs w-full mt-1">
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="credit">Credit</option>
                </select>
              </div>
              {paymentMethod === "cash" && (
                <div>
                  <label className="text-xs font-bold">Cash Received</label>
                  <Input type="number" value={cashReceived} onChange={(e) => setCashReceived(Number(e.target.value))} className="nb-input text-sm mt-1" autoFocus />
                  {change > 0 && (
                    <p className="text-sm font-bold text-green-700 mt-1">Change: PKR {change.toFixed(2)}</p>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={() => handleSave()} className="nb-btn flex-1 text-sm py-3">
                  <Banknote className="size-4 mr-2" /> Save & Print
                </Button>
                <Button onClick={() => handleSave()} variant="outline" className="nb-btn-outline text-sm">
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
