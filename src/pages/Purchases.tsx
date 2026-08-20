import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ShoppingCart,
  Plus,
  Search,
  Trash2,
  Save,
  Printer,
  Pause,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

/* ── Column definitions (order matters for keyboard nav) ── */
const TABLE_COLS = [
  { key: "index", label: "#", editable: false },
  { key: "productName", label: "Product", editable: false },
  { key: "unit", label: "Unit", editable: false },
  { key: "quantity", label: "Qty", editable: true, type: "number" },
  { key: "purchasePrice", label: "Pur.Price", editable: true, type: "number" },
  { key: "retailPrice", label: "Retail", editable: true, type: "number" },
  { key: "cost", label: "Cost", editable: true, type: "number" },
  { key: "margin", label: "Margin", editable: true, type: "number" },
  { key: "marginPercent", label: "Mgn%", editable: true, type: "number" },
  { key: "discount", label: "Disc", editable: true, type: "number" },
  { key: "extraDiscount", label: "X.Dis", editable: true, type: "number" },
  { key: "taxPercent", label: "Tax%", editable: true, type: "number" },
  { key: "taxAmount", label: "TaxAmt", editable: true, type: "number" },
  { key: "netRate", label: "NetRate", editable: true, type: "number" },
  { key: "finalTotal", label: "Total", editable: true, type: "number" },
  { key: "batchNumber", label: "Batch", editable: true, type: "text" },
  { key: "expiryDate", label: "Expiry", editable: true, type: "date" },
  { key: "pack", label: "Pack", editable: true, type: "number" },
  { key: "delete", label: "", editable: false },
];
const EDITABLE_INDICES = TABLE_COLS.map((c, i) => (c.editable ? i : -1)).filter(
  (i) => i >= 0
);

interface PurchaseItem {
  productId: Id<"products">;
  productName: string;
  unit: string;
  quantity: number;
  purchasePrice: number;
  retailPrice: number;
  cost: number;
  margin: number;
  marginPercent: number;
  discount: number;
  extraDiscount: number;
  taxPercent: number;
  taxAmount: number;
  netRate: number;
  total: number;
  finalTotal: number;
  batchNumber: string;
  expiryDate: string;
  pack: number;
  unitQuantity: number;
  commission: number;
  barcode: string;
}

export default function Purchases() {
  const products = useQuery(api.products.list);
  const suppliers = useQuery(api.suppliers.list);
  const purchaseList = useQuery(api.purchases.list);
  const heldPurchases = useQuery(api.purchases.getHeld);
  const createPurchase = useMutation(api.purchases.create);
  const holdPurchase = useMutation(api.purchases.hold);
  const removeHeld = useMutation(api.purchases.removeHeld);
  const logActivity = useMutation(api.activityLogs.create);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<
    typeof products extends (infer T)[] | undefined ? T[] : never
  >([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedResultIdx, setSelectedResultIdx] = useState(0);

  const [qtyValue, setQtyValue] = useState("");
  const [showQty, setShowQty] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<
    NonNullable<typeof products>[number] | null
  >(null);

  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState(0);
  const [billNumber, setBillNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [purchaseTax, setPurchaseTax] = useState(0);
  const [loadingExpense, setLoadingExpense] = useState(0);
  const [freightExpense, setFreightExpense] = useState(0);
  const [otherExpense, setOtherExpense] = useState(0);
  const [additionalAmount, setAdditionalAmount] = useState(0);
  const [additionalDiscount, setAdditionalDiscount] = useState(0);
  const [advanceTax, setAdvanceTax] = useState(0);
  const [advanceTaxPercent, setAdvanceTaxPercent] = useState(0);
  const [advanceTaxValue, setAdvanceTaxValue] = useState(0);
  const [comments, setComments] = useState("");

  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [showHeader, setShowHeader] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  /* ── Table cell editing state ── */
  const [selectedCell, setSelectedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [editingCell, setEditingCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);
  const editHandledRef = useRef(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);

  /* ────────── Search products ────────── */
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

  /* ────────── Recalculate all derived fields from source fields ────────── */
  const recalcItem = useCallback((item: PurchaseItem): PurchaseItem => {
    const qty = item.quantity;
    const purPrice = item.purchasePrice;
    const retPrice = item.retailPrice;
    const disc = item.discount;
    const extraDisc = item.extraDiscount;
    const taxP = item.taxPercent;

    const total = purPrice * qty;
    const taxAmt = (total * taxP) / 100;
    const finalTotal = total - disc - extraDisc + taxAmt;
    const netRate = qty > 0 ? finalTotal / qty : purPrice;
    const cost = netRate;
    const margin = retPrice - cost;
    const marginPercent = retPrice > 0 ? (margin / retPrice) * 100 : 0;

    return {
      ...item,
      total,
      taxAmount: taxAmt,
      finalTotal,
      netRate,
      cost,
      margin,
      marginPercent,
      unitQuantity: qty,
    };
  }, []);

  /* ────────── Select product from search ────────── */
  const selectProduct = useCallback(
    (product: (typeof searchResults)[0]) => {
      setSelectedProduct(product);
      setSearchTerm("");
      setShowResults(false);
      setQtyValue("1");
      setShowQty(true);
      setTimeout(() => qtyRef.current?.focus(), 50);
    },
    []
  );

  /* ────────── Add item to table ────────── */
  const addItem = useCallback(() => {
    if (!selectedProduct || !qtyValue) return;
    const qty = parseInt(qtyValue) || 1;

    const newItem: PurchaseItem = {
      productId: selectedProduct._id,
      productName: selectedProduct.name,
      unit: selectedProduct.unit,
      quantity: qty,
      purchasePrice: selectedProduct.purchasePrice,
      retailPrice: selectedProduct.retailPrice,
      cost: 0,
      margin: 0,
      marginPercent: 0,
      discount: selectedProduct.discount ?? 0,
      extraDiscount: 0,
      taxPercent: selectedProduct.tax ?? 0,
      taxAmount: 0,
      netRate: 0,
      total: 0,
      finalTotal: 0,
      batchNumber: selectedProduct.batchNumber ?? "",
      expiryDate: selectedProduct.expiryDate ?? "",
      pack: 1,
      unitQuantity: qty,
      commission: 0,
      barcode: selectedProduct.barcode ?? "",
    };

    setItems((prev) => [...prev, recalcItem(newItem)]);
    setSelectedProduct(null);
    setShowQty(false);
    setQtyValue("");
    setSearchTerm("");
    setTimeout(() => searchRef.current?.focus(), 50);
  }, [selectedProduct, qtyValue, recalcItem]);

  const removeItem = useCallback((idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  /* ────────── Update any field in a table row + full recalc ────────── */
  const updateItemField = useCallback(
    (idx: number, field: string, value: string) => {
      setItems((prev) =>
        prev.map((item, i) => {
          if (i !== idx) return item;
          const numVal = parseFloat(value) || 0;
          const updated = { ...item };

          switch (field) {
            case "quantity":
              updated.quantity = Math.max(0, numVal);
              break;
            case "purchasePrice":
              updated.purchasePrice = Math.max(0, numVal);
              break;
            case "retailPrice":
              updated.retailPrice = Math.max(0, numVal);
              break;
            case "discount":
              updated.discount = Math.max(0, numVal);
              break;
            case "extraDiscount":
              updated.extraDiscount = Math.max(0, numVal);
              break;
            case "taxPercent":
              updated.taxPercent = Math.max(0, numVal);
              break;
            case "taxAmount":
              // Back-calculate tax percent
              if (updated.total > 0)
                updated.taxPercent = (numVal / updated.total) * 100;
              break;
            case "cost":
              // cost = netRate; back-calc purchasePrice
              // netRate = (pP*qty - disc - eDisc + pP*qty*tP/100) / qty
              // → pP = (nR*qty + disc + eDisc) / (qty*(1 + tP/100))
              {
                const q = updated.quantity;
                const t = updated.taxPercent / 100;
                if (q > 0 && 1 + t > 0) {
                  updated.purchasePrice =
                    (numVal * q + updated.discount + updated.extraDiscount) /
                    (q * (1 + t));
                }
              }
              break;
            case "margin":
              // margin = retailPrice - cost → retailPrice = margin + cost
              updated.retailPrice = numVal + updated.cost;
              break;
            case "marginPercent": {
              // margin% = margin / retailPrice * 100
              // → retailPrice = cost / (1 - margin%/100)
              const base = updated.cost;
              if (base > 0 && numVal < 100) {
                updated.retailPrice = base / (1 - numVal / 100);
              }
              break;
            }
            case "total":
              // "Total" column = finalTotal; back-calc purchasePrice
              // finalTotal = pP*qty - disc - eDisc + pP*qty*tP/100
              // → pP = (finalTotal + disc + eDisc) / (qty*(1 + tP/100))
              {
                const q2 = updated.quantity;
                const t2 = updated.taxPercent / 100;
                if (q2 > 0 && 1 + t2 > 0) {
                  updated.purchasePrice =
                    (numVal + updated.discount + updated.extraDiscount) /
                    (q2 * (1 + t2));
                }
              }
              break;
            case "netRate":
              // Same back-calc as cost
              {
                const q3 = updated.quantity;
                const t3 = updated.taxPercent / 100;
                if (q3 > 0 && 1 + t3 > 0) {
                  updated.purchasePrice =
                    (numVal * q3 + updated.discount + updated.extraDiscount) /
                    (q3 * (1 + t3));
                }
              }
              break;
            case "batchNumber":
              updated.batchNumber = value;
              break;
            case "expiryDate":
              updated.expiryDate = value;
              break;
            case "pack":
              updated.pack = Math.max(1, numVal);
              break;
          }

          return recalcItem(updated);
        })
      );
    },
    [recalcItem]
  );

  /* ────────── Cell value helpers ────────── */
  const getCellValue = useCallback(
    (item: PurchaseItem, key: string): string => {
      const val = (item as unknown as Record<string, unknown>)[key];
      if (typeof val === "number") return String(val);
      return String(val ?? "");
    },
    []
  );

  const formatDisplay = useCallback(
    (item: PurchaseItem, key: string): string => {
      const val = (item as unknown as Record<string, unknown>)[key];
      if (typeof val === "number") {
        if (key === "taxPercent" || key === "marginPercent")
          return val.toFixed(1);
        return val.toFixed(2);
      }
      return String(val ?? "-");
    },
    []
  );

  /* ────────── Find next/prev editable column ────────── */
  const findNextEditableCol = useCallback(
    (currentCol: number, direction: number): number => {
      let idx = EDITABLE_INDICES.indexOf(currentCol);
      if (idx < 0) idx = direction > 0 ? 0 : EDITABLE_INDICES.length - 1;
      let next = idx + direction;
      if (next >= EDITABLE_INDICES.length) next = 0;
      if (next < 0) next = EDITABLE_INDICES.length - 1;
      return EDITABLE_INDICES[next];
    },
    []
  );

  /* ────────── Cell click handler ────────── */
  const handleCellClick = useCallback(
    (rowIdx: number, colIdx: number) => {
      if (!TABLE_COLS[colIdx].editable) return;
      setSelectedCell({ row: rowIdx, col: colIdx });
      setEditingCell({ row: rowIdx, col: colIdx });
      setEditValue(getCellValue(items[rowIdx], TABLE_COLS[colIdx].key));
    },
    [items, getCellValue]
  );

  /* ────────── Keyboard handler for editing input ────────── */
  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent, rowIdx: number, colIdx: number) => {
      if (e.key === "Enter") {
        e.preventDefault();
        editHandledRef.current = true;
        updateItemField(rowIdx, TABLE_COLS[colIdx].key, editValue);
        // Move to next row, same column
        if (rowIdx < items.length - 1) {
          setEditingCell({ row: rowIdx + 1, col: colIdx });
          setEditValue(
            getCellValue(items[rowIdx + 1], TABLE_COLS[colIdx].key)
          );
        } else {
          setEditingCell(null);
          setEditValue("");
        }
      } else if (e.key === "Tab") {
        e.preventDefault();
        editHandledRef.current = true;
        updateItemField(rowIdx, TABLE_COLS[colIdx].key, editValue);
        const nextCol = findNextEditableCol(
          colIdx,
          e.shiftKey ? -1 : 1
        );
        setEditingCell({ row: rowIdx, col: nextCol });
        setEditValue(getCellValue(items[rowIdx], TABLE_COLS[nextCol].key));
      } else if (e.key === "Escape") {
        e.preventDefault();
        editHandledRef.current = true;
        setEditingCell(null);
        setEditValue("");
        searchRef.current?.focus();
      }
    },
    [editValue, items, updateItemField, getCellValue, findNextEditableCol]
  );

  /* ────────── Focus management for editing input ────────── */
  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingCell]);

  /* ────────── Table-level keyboard navigation (when not editing) ────────── */
  const handleTableKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (editingCell) return; // editing input handles its own keys
      if (items.length === 0) return;

      const row = selectedCell?.row ?? 0;
      const col = selectedCell?.col ?? 3; // default to Qty column

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const nextRow = Math.min(row + 1, items.length - 1);
        setSelectedCell({ row: nextRow, col });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prevRow = Math.max(row - 1, 0);
        setSelectedCell({ row: prevRow, col });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const nextCol = findNextEditableCol(col, 1);
        setSelectedCell({ row, col: nextCol });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const prevCol = findNextEditableCol(col, -1);
        setSelectedCell({ row, col: prevCol });
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (selectedCell && TABLE_COLS[selectedCell.col].editable) {
          handleCellClick(selectedCell.row, selectedCell.col);
        }
      } else if (e.key === "Tab") {
        e.preventDefault();
        const nextCol = findNextEditableCol(col, e.shiftKey ? -1 : 1);
        setSelectedCell({ row, col: nextCol });
        // Auto-start editing
        if (TABLE_COLS[nextCol].editable) {
          handleCellClick(row, nextCol);
        }
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedCell) {
          e.preventDefault();
          removeItem(selectedCell.row);
          setSelectedCell(null);
        }
      }
    },
    [
      editingCell,
      selectedCell,
      items,
      findNextEditableCol,
      handleCellClick,
      removeItem,
    ]
  );

  /* ────────── Totals ────────── */
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const totalTax = items.reduce((sum, item) => sum + item.taxAmount, 0);
  const totalDiscount = items.reduce(
    (sum, item) => sum + item.discount + item.extraDiscount,
    0
  );
  const grandTotal =
    subtotal -
    totalDiscount +
    totalTax +
    loadingExpense +
    freightExpense +
    otherExpense +
    additionalAmount +
    advanceTaxValue -
    additionalDiscount;

  /* ────────── Search bar keyboard shortcuts ────────── */
  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowResults(false);
        setSearchTerm("");
        return;
      }
      if (e.key === "ArrowDown" && showResults) {
        e.preventDefault();
        setSelectedResultIdx((prev) =>
          Math.min(prev + 1, searchResults.length - 1)
        );
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
        handleSave();
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
    },
    [showResults, searchResults, selectedResultIdx, selectProduct]
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

  /* ────────── Global shortcuts ────────── */
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
        handleSave();
      }
      if (e.key === "P" && e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        handlePrint();
      }
      if (e.key === "h" && e.ctrlKey) {
        e.preventDefault();
        handleHold();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  /* ────────── Save / Hold / Print / Resume / Reset (unchanged) ────────── */
  const handleSave = useCallback(async () => {
    if (items.length === 0) {
      toast.error("Add at least one product");
      return;
    }
    if (!invoiceNumber.trim()) {
      toast.error("Invoice number is required");
      return;
    }
    try {
      await createPurchase({
        supplierId: (supplierId || undefined) as Id<"suppliers"> | undefined,
        invoiceNumber,
        invoiceAmount: invoiceAmount || undefined,
        billNumber: billNumber || undefined,
        date,
        dueDate: dueDate || undefined,
        paymentMode,
        purchaseTax: purchaseTax || undefined,
        loadingExpense: loadingExpense || undefined,
        freightExpense: freightExpense || undefined,
        otherExpense: otherExpense || undefined,
        additionalAmount: additionalAmount || undefined,
        additionalDiscount: additionalDiscount || undefined,
        advanceTax: advanceTax || undefined,
        advanceTaxPercent: advanceTaxPercent || undefined,
        advanceTaxValue: advanceTaxValue || undefined,
        totalAmount: grandTotal,
        comments: comments || undefined,
        items,
      });
      await logActivity({
        action: "Purchase created",
        module: "purchases",
        details: invoiceNumber,
      });
      toast.success("Purchase saved successfully");
      resetForm();
    } catch (e) {
      toast.error(String(e));
    }
  }, [
    items,
    invoiceNumber,
    invoiceAmount,
    billNumber,
    date,
    dueDate,
    paymentMode,
    purchaseTax,
    loadingExpense,
    freightExpense,
    otherExpense,
    additionalAmount,
    additionalDiscount,
    advanceTax,
    advanceTaxPercent,
    advanceTaxValue,
    grandTotal,
    comments,
    supplierId,
    createPurchase,
    logActivity,
  ]);

  const handleHold = useCallback(async () => {
    if (items.length === 0) {
      toast.error("No items to hold");
      return;
    }
    try {
      await holdPurchase({
        data: {
          items,
          invoiceNumber,
          date,
          supplierId,
          paymentMode,
          grandTotal,
        },
      });
      toast.success("Purchase held");
    } catch (e) {
      toast.error(String(e));
    }
  }, [
    items,
    invoiceNumber,
    date,
    supplierId,
    paymentMode,
    grandTotal,
    holdPurchase,
  ]);

  const handleResumeHeld = useCallback(
    async (
      held: typeof heldPurchases extends (infer T)[] | undefined
        ? T
        : never
    ) => {
      const data = held.data;
      if (data.items) setItems(data.items);
      if (data.invoiceNumber) setInvoiceNumber(data.invoiceNumber);
      if (data.date) setDate(data.date);
      if (data.supplierId) setSupplierId(data.supplierId);
      if (data.paymentMode) setPaymentMode(data.paymentMode);
      await removeHeld({ id: held._id });
      toast.success("Purchase resumed");
    },
    [removeHeld]
  );

  const handlePrint = useCallback(() => {
    const printContent = `
      <html><head><title>GRN - ${invoiceNumber}</title>
      <style>
        body{font-family:'Courier New',monospace;font-size:11px;margin:10px;}
        .header{text-align:center;border-bottom:2px solid #000;padding-bottom:8px;}
        table{width:100%;border-collapse:collapse;margin:10px 0;}
        th,td{border:1px solid #000;padding:4px 6px;text-align:left;font-size:10px;}
        th{background:#f0f0f0;}
        .total{text-align:right;font-weight:bold;font-size:13px;}
      </style></head><body>
      <div class="header">
        <h2>FREE BUFF PHARMACY</h2>
        <p>Goods Receipt Note</p>
        <p>Invoice: ${invoiceNumber} | Date: ${date}</p>
      </div>
      <table><thead><tr>
        <th>#</th><th>Product</th><th>Qty</th><th>Price</th><th>Tax%</th><th>Total</th>
      </tr></thead><tbody>
      ${items
        .map(
          (item, i) => `<tr>
        <td>${i + 1}</td>
        <td>${item.productName}</td>
        <td>${item.quantity}</td>
        <td>${item.purchasePrice}</td>
        <td>${item.taxPercent}%</td>
        <td>${item.finalTotal.toFixed(2)}</td>
      </tr>`
        )
        .join("")}
      </tbody></table>
      <div class="total">Grand Total: PKR ${grandTotal.toFixed(2)}</div>
      <p style="text-align:center;margin-top:20px;">Thank you!</p>
      </body></html>
    `;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(printContent);
      w.document.close();
      w.print();
    }
  }, [items, invoiceNumber, date, grandTotal]);

  const resetForm = useCallback(() => {
    setItems([]);
    setInvoiceNumber("");
    setInvoiceAmount(0);
    setBillNumber("");
    setDate(new Date().toISOString().split("T")[0]);
    setDueDate("");
    setPaymentMode("cash");
    setPurchaseTax(0);
    setLoadingExpense(0);
    setFreightExpense(0);
    setOtherExpense(0);
    setAdditionalAmount(0);
    setAdditionalDiscount(0);
    setAdvanceTax(0);
    setAdvanceTaxPercent(0);
    setAdvanceTaxValue(0);
    setComments("");
    setSupplierId("");
    setSearchTerm("");
    setShowQty(false);
    setSelectedProduct(null);
    setSelectedCell(null);
    setEditingCell(null);
    setEditValue("");
  }, []);

  /* ══════════════════════ JSX ══════════════════════ */
  return (
    <div className="space-y-4" onKeyDown={handleSearchKeyDown}>
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingCart className="size-6" />
          Purchase / GRN
        </h1>
        <div className="flex gap-2">
          <Button onClick={handleHold} className="nb-btn-accent text-xs">
            <Pause className="size-3 mr-1" /> Hold
          </Button>
          <Button onClick={handleSave} className="nb-btn text-xs">
            <Save className="size-3 mr-1" /> Save
          </Button>
          <Button onClick={handlePrint} className="nb-btn-outline text-xs">
            <Printer className="size-3 mr-1" /> Print
          </Button>
          <Button
            onClick={() => setShowHistory(!showHistory)}
            variant="outline"
            className="nb-btn-outline text-xs"
          >
            History
          </Button>
        </div>
      </div>

      {/* ── Held Purchases ── */}
      {heldPurchases && heldPurchases.length > 0 && (
        <Card className="nb-card-sm border-yellow-400">
          <CardContent className="p-3">
            <p className="text-xs font-bold mb-2">
              Held Purchases ({heldPurchases.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {heldPurchases.map((held) => (
                <Button
                  key={held._id}
                  onClick={() => handleResumeHeld(held)}
                  className="nb-btn-accent text-xs"
                >
                  Resume ({held.data.invoiceNumber || "No Invoice"})
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Header Section ── */}
      <Card className="nb-card">
        <CardHeader
          className="pb-2 cursor-pointer"
          onClick={() => setShowHeader(!showHeader)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider">
              Purchase Details
            </CardTitle>
            {showHeader ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </div>
        </CardHeader>
        {showHeader && (
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div>
                <label className="text-xs font-bold">Supplier</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="nb-input text-xs mt-1 w-full"
                >
                  <option value="">Select Supplier</option>
                  {(suppliers ?? []).map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold">Invoice # *</label>
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="nb-input text-xs mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold">Invoice Amount</label>
                <Input
                  type="number"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(Number(e.target.value))}
                  className="nb-input text-xs mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold">Date *</label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="nb-input text-xs mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold">Due Date</label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="nb-input text-xs mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold">Bill #</label>
                <Input
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  className="nb-input text-xs mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="nb-input text-xs mt-1 w-full"
                >
                  <option value="cash">Cash</option>
                  <option value="credit">Credit</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold">Purchase Tax %</label>
                <Input
                  type="number"
                  value={purchaseTax}
                  onChange={(e) => setPurchaseTax(Number(e.target.value))}
                  className="nb-input text-xs mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold">Loading Expense</label>
                <Input
                  type="number"
                  value={loadingExpense}
                  onChange={(e) => setLoadingExpense(Number(e.target.value))}
                  className="nb-input text-xs mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold">Freight Expense</label>
                <Input
                  type="number"
                  value={freightExpense}
                  onChange={(e) => setFreightExpense(Number(e.target.value))}
                  className="nb-input text-xs mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold">Other Expense</label>
                <Input
                  type="number"
                  value={otherExpense}
                  onChange={(e) => setOtherExpense(Number(e.target.value))}
                  className="nb-input text-xs mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold">Additional Amount</label>
                <Input
                  type="number"
                  value={additionalAmount}
                  onChange={(e) => setAdditionalAmount(Number(e.target.value))}
                  className="nb-input text-xs mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold">
                  Additional Discount
                </label>
                <Input
                  type="number"
                  value={additionalDiscount}
                  onChange={(e) =>
                    setAdditionalDiscount(Number(e.target.value))
                  }
                  className="nb-input text-xs mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold">Advance Tax %</label>
                <Input
                  type="number"
                  value={advanceTaxPercent}
                  onChange={(e) => {
                    setAdvanceTaxPercent(Number(e.target.value));
                    setAdvanceTaxValue(
                      (invoiceAmount * Number(e.target.value)) / 100
                    );
                  }}
                  className="nb-input text-xs mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold">Advance Tax Value</label>
                <Input
                  type="number"
                  value={advanceTaxValue}
                  readOnly
                  className="nb-input text-xs mt-1 bg-muted"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold">Comments</label>
              <Input
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="nb-input text-xs mt-1"
                placeholder="Optional comments..."
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── Product Search Area ── */}
      <Card className="nb-card-sm">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search product (Ctrl+P) - by name, code, barcode, generic, brand..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="nb-input w-full pl-10 text-sm"
                autoFocus
              />
            </div>
            <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
              Ctrl+P
            </span>
          </div>

          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="mt-2 border-2 border-border bg-card max-h-48 overflow-auto">
              {searchResults.slice(0, 15).map((product, idx) => (
                <div
                  key={product._id}
                  className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer border-b border-border last:border-0
                    ${
                      idx === selectedResultIdx
                        ? "bg-accent"
                        : "hover:bg-muted"
                    }`}
                  onClick={() => selectProduct(product)}
                  onMouseEnter={() => setSelectedResultIdx(idx)}
                >
                  <div>
                    <span className="font-bold">{product.name}</span>
                    <span className="ml-2 text-muted-foreground">
                      {product.code}
                    </span>
                    {product.brand && (
                      <span className="ml-2 text-muted-foreground">
                        {product.brand}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <span>
                      Stock: <b>{product.currentStock}</b>
                    </span>
                    <span>PKR {product.purchasePrice}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quantity Input Popup */}
          {showQty && selectedProduct && (
            <div className="mt-2 p-3 bg-muted border-2 border-border">
              <p className="text-xs font-bold mb-1">
                Selected: {selectedProduct.name} ({selectedProduct.code})
                <span className="ml-2 text-muted-foreground">
                  Price: PKR {selectedProduct.purchasePrice}
                </span>
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
                <Button onClick={addItem} className="nb-btn text-xs">
                  Add (Enter)
                </Button>
                <span className="text-[10px] text-muted-foreground">
                  Total: PKR{" "}
                  {(
                    selectedProduct.purchasePrice * (parseInt(qtyValue) || 1)
                  ).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ══════════════════ PURCHASE TABLE ══════════════════ */}
      <Card className="nb-card">
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[calc(100vh-450px)]">
            <table
              className="nb-table"
              tabIndex={0}
              onKeyDown={handleTableKeyDown}
            >
              <thead>
                <tr>
                  {TABLE_COLS.map((col) => (
                    <th
                      key={col.key}
                      className={`text-xs ${
                        col.key === "delete" ? "w-8" : ""
                      } ${
                        ["quantity", "purchasePrice", "retailPrice", "cost",
                         "margin", "marginPercent", "discount", "extraDiscount",
                         "taxPercent", "taxAmount", "netRate", "finalTotal", "pack"
                        ].includes(col.key)
                          ? "text-right"
                          : ""
                      }`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={TABLE_COLS.length}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No products added. Press Ctrl+P to search and add
                      products.
                    </td>
                  </tr>
                ) : (
                  items.map((item, rowIdx) => (
                    <tr
                      key={rowIdx}
                      className={
                        selectedCell?.row === rowIdx ? "bg-accent/30" : ""
                      }
                    >
                      {TABLE_COLS.map((col, colIdx) => {
                        /* Row number */
                        if (col.key === "index") {
                          return (
                            <td key={colIdx} className="text-xs">
                              {rowIdx + 1}
                            </td>
                          );
                        }
                        /* Product name */
                        if (col.key === "productName") {
                          return (
                            <td
                              key={colIdx}
                              className="font-semibold text-xs"
                            >
                              {item.productName}
                            </td>
                          );
                        }
                        /* Unit */
                        if (col.key === "unit") {
                          return (
                            <td key={colIdx} className="text-xs">
                              {item.unit}
                            </td>
                          );
                        }
                        /* Delete button */
                        if (col.key === "delete") {
                          return (
                            <td key={colIdx}>
                              <button
                                onClick={() => removeItem(rowIdx)}
                                className="p-1 hover:bg-destructive/10 border-2 border-transparent hover:border-border"
                              >
                                <Trash2 className="size-3 text-destructive" />
                              </button>
                            </td>
                          );
                        }
                        /* All editable cells */
                        const isEditing =
                          editingCell?.row === rowIdx &&
                          editingCell?.col === colIdx;
                        const isSelected =
                          selectedCell?.row === rowIdx &&
                          selectedCell?.col === colIdx;
                        const displayVal = formatDisplay(item, col.key);
                        const isRightAligned = [
                          "quantity",
                          "purchasePrice",
                          "retailPrice",
                          "cost",
                          "margin",
                          "marginPercent",
                          "discount",
                          "extraDiscount",
                          "taxPercent",
                          "taxAmount",
                          "netRate",
                          "finalTotal",
                          "pack",
                        ].includes(col.key);

                        return (
                          <td
                            key={colIdx}
                            className={`text-xs p-0 ${
                              isRightAligned ? "text-right" : ""
                            }`}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleCellClick(rowIdx, colIdx);
                            }}
                            style={{ cursor: "pointer" }}
                          >
                            {isEditing ? (
                              <input
                                ref={editInputRef}
                                type={col.type === "number" ? "number" : "text"}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) =>
                                  handleEditKeyDown(e, rowIdx, colIdx)
                                }
                                onBlur={() => {
                                  if (editHandledRef.current) {
                                    editHandledRef.current = false;
                                    return;
                                  }
                                  if (editingCell) {
                                    updateItemField(
                                      editingCell.row,
                                      TABLE_COLS[editingCell.col].key,
                                      editValue
                                    );
                                    setEditingCell(null);
                                    setEditValue("");
                                  }
                                }}
                                className={`nb-input w-full text-xs py-0.5 px-1 border-2 border-primary ${
                                  isRightAligned ? "text-right" : ""
                                }`}
                                step={col.type === "number" ? "any" : undefined}
                              />
                            ) : (
                              <span
                                className={`block px-1 py-1 ${
                                  isSelected
                                    ? "bg-primary/10 border-2 border-primary"
                                    : "border-2 border-transparent hover:bg-muted/50"
                                } ${
                                  [
                                    "margin",
                                    "marginPercent",
                                    "netRate",
                                    "finalTotal",
                                  ].includes(col.key)
                                    ? "font-bold"
                                    : ""
                                } ${
                                  col.key === "margin" ||
                                  col.key === "marginPercent"
                                    ? "text-green-700"
                                    : ""
                                }`}
                              >
                                {col.key === "taxPercent"
                                  ? `${displayVal}%`
                                  : col.key === "marginPercent"
                                  ? `${displayVal}%`
                                  : displayVal}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── Totals ── */}
          {items.length > 0 && (
            <div className="border-t-2 border-border p-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-sm">
                <span className="font-bold">Subtotal: </span>
                <span>PKR {subtotal.toFixed(2)}</span>
              </div>
              <div className="text-sm">
                <span className="font-bold">Tax: </span>
                <span>PKR {totalTax.toFixed(2)}</span>
              </div>
              <div className="text-sm">
                <span className="font-bold">Discount: </span>
                <span>PKR {totalDiscount.toFixed(2)}</span>
              </div>
              <div className="text-sm font-bold text-lg">
                Grand Total: PKR {grandTotal.toFixed(2)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Purchase History ── */}
      {showHistory && (
        <Card className="nb-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center justify-between">
              Purchase History
              <button onClick={() => setShowHistory(false)}>
                <X className="size-4" />
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-64">
              <table className="nb-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Date</th>
                    <th>Supplier</th>
                    <th className="text-right">Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(purchaseList ?? []).slice(0, 20).map((p) => (
                    <tr key={p._id}>
                      <td className="text-xs font-bold">
                        {p.invoiceNumber}
                      </td>
                      <td className="text-xs">{p.date}</td>
                      <td className="text-xs">
                        {(suppliers ?? []).find((s) => s._id === p.supplierId)
                          ?.name ?? "-"}
                      </td>
                      <td className="text-right text-xs">
                        PKR {p.totalAmount.toLocaleString()}
                      </td>
                      <td className="text-xs">
                        <span
                          className={`nb-badge ${
                            p.status === "completed"
                              ? "bg-green-100"
                              : "bg-yellow-100"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
