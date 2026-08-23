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
  History,
  FileText,
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

// Read pharmacy settings from localStorage
function getPharmacySettings() {
  return {
    name: localStorage.getItem("pharmacy_name") || "Free Buff Pharmacy",
    phone: localStorage.getItem("pharmacy_phone") || "0300-1234567",
    address: localStorage.getItem("pharmacy_address") || "Main Street, City",
    receiptWidth: localStorage.getItem("receipt_width") || "80mm",
  };
}

// Receipt HTML generator — supports 58mm, 80mm, and A4
function generateReceiptHTML(data: {
  invoiceNumber: string;
  date: string;
  cashierName?: string;
  items: SaleItem[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  cashReceived: number;
  change: number;
  paymentMethod: string;
  customerName?: string;
}) {
  const settings = getPharmacySettings();
  const widthMap: Record<string, string> = {
    "58mm": "58mm",
    "80mm": "80mm",
    A4: "210mm",
  };
  const maxWidth = widthMap[settings.receiptWidth] || "80mm";
  const isA4 = settings.receiptWidth === "A4";

  const itemRows = data.items
    .map(
      (item) => `
    <tr>
      <td style="padding:4px 6px;border-bottom:1px dashed #ccc;white-space:nowrap;">${item.productName}</td>
      <td style="padding:4px 6px;border-bottom:1px dashed #ccc;text-align:right;white-space:nowrap;">${item.quantity}</td>
      <td style="padding:4px 6px;border-bottom:1px dashed #ccc;text-align:right;white-space:nowrap;">${item.salePrice.toFixed(2)}</td>
      ${item.discount > 0 ? `<td style="padding:4px 6px;border-bottom:1px dashed #ccc;text-align:right;white-space:nowrap;">-${item.discount.toFixed(2)}</td>` : `<td style="padding:4px 6px;border-bottom:1px dashed #ccc;text-align:right;">—</td>`}
      <td style="padding:4px 6px;border-bottom:1px dashed #ccc;text-align:right;white-space:nowrap;font-weight:bold;">${item.total.toFixed(2)}</td>
    </tr>`
    )
    .join("");

  // Simple line-by-line format for thermal printers
  const thermalItems = data.items
    .map(
      (item) =>
        `${item.productName.substring(0, isA4 ? 40 : 24).padEnd(isA4 ? 40 : 24)}${String(item.quantity).padStart(3)} ${item.total.toFixed(2).padStart(10)}`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
<title>Receipt - ${data.invoiceNumber}</title>
<style>
  @media print {
    @page { margin: 0; size: auto; }
    body { margin: 0; padding: 0; }
    .no-print { display: none !important; }
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'Courier New', 'Consolas', monospace;
    margin: 0;
    padding: 10px;
    font-size: ${isA4 ? "12px" : "11px"};
    line-height: 1.4;
    color: #000;
    background: #fff;
  }
  .receipt {
    max-width: ${maxWidth};
    margin: 0 auto;
    padding: 8px;
  }
  .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
  .header h2 { margin: 0 0 2px 0; font-size: ${isA4 ? "18px" : "14px"}; }
  .header p { margin: 1px 0; font-size: ${isA4 ? "11px" : "10px"}; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0; }
  th { text-align: left; border-bottom: 2px solid #000; padding: 4px 6px; font-size: ${isA4 ? "11px" : "9px"}; text-transform: uppercase; }
  td { font-size: ${isA4 ? "11px" : "10px"}; }
  .line { border-top: 1px dashed #000; margin: 6px 0; }
  .totals { margin-top: 6px; }
  .totals div { display: flex; justify-content: space-between; padding: 2px 0; font-size: ${isA4 ? "12px" : "10px"}; }
  .grand-total { font-size: ${isA4 ? "16px" : "13px"}; font-weight: bold; border-top: 2px solid #000; padding-top: 4px; margin-top: 6px; }
  .footer { text-align: center; margin-top: 12px; padding-top: 8px; border-top: 2px dashed #000; font-size: ${isA4 ? "11px" : "9px"}; }
  .print-btn { display: block; margin: 20px auto; padding: 10px 24px; font-size: 14px; cursor: pointer; border: 2px solid #000; background: #fff; }
  .print-btn:hover { background: #f0f0f0; }
</style>
</head>
<body>
<div class="no-print" style="text-align:center;margin-bottom:10px;">
  <button class="print-btn" onclick="window.print();">🖨️ Print Receipt</button>
</div>
<div class="receipt">
  <div class="header">
    <h2>${settings.name.toUpperCase()}</h2>
    <p>${settings.address}</p>
    <p>Phone: ${settings.phone}</p>
    <div class="line"></div>
    <p><strong>Invoice: ${data.invoiceNumber}</strong></p>
    <p>Date: ${data.date}</p>
    ${data.customerName ? `<p>Customer: ${data.customerName}</p>` : ""}
    <p>Payment: ${data.paymentMethod.toUpperCase()}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>Product</th>
        <th style="text-align:right;">Qty</th>
        <th style="text-align:right;">Price</th>
        <th style="text-align:right;">Disc</th>
        <th style="text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal:</span><span>PKR ${data.subtotal.toFixed(2)}</span></div>
    ${data.totalDiscount > 0 ? `<div><span>Discount:</span><span>-PKR ${data.totalDiscount.toFixed(2)}</span></div>` : ""}
    ${data.totalTax > 0 ? `<div><span>Tax:</span><span>PKR ${data.totalTax.toFixed(2)}</span></div>` : ""}
    <div class="grand-total"><span>TOTAL:</span><span>PKR ${data.grandTotal.toFixed(2)}</span></div>
  </div>

  <div class="line"></div>

  <div style="display:flex;justify-content:space-between;font-size:${isA4 ? "12px" : "10px"};">
    <span>Cash Received: PKR ${data.cashReceived.toFixed(2)}</span>
    ${data.change > 0 ? `<span>Change: PKR ${data.change.toFixed(2)}</span>` : ""}
  </div>

  <div class="footer">
    <p><strong>Thank you for your purchase!</strong></p>
    <p>Get well soon 🙏</p>
    ${data.cashierName ? `<p>Cashier: ${data.cashierName}</p>` : ""}
  </div>
</div>

<script>
  // Auto-print on load (for popup/redirect scenarios)
  window.onload = function() {
    setTimeout(function() { window.print(); }, 300);
  };
</script>
</body>
</html>`;
}

// Print via hidden iframe — works without popup blockers
function printViaIframe(html: string): boolean {
  try {
    // Remove any existing print iframe
    const existing = document.getElementById("pos-print-frame") as HTMLIFrameElement | null;
    if (existing) existing.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "pos-print-frame";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      toast.error("Could not create print frame. Please try again.");
      return false;
    }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    // Wait for content to render, then print
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        toast.error("Print failed. Please try again or use Ctrl+P.");
      }
      // Clean up iframe after printing
      setTimeout(() => {
        iframe.remove();
      }, 2000);
    }, 500);

    return true;
  } catch (err) {
    toast.error(`Print error: ${String(err)}`);
    return false;
  }
}

// Build receipt data from a sale record (for reprint from history)
function receiptDataFromSale(
  sale: {
    invoiceNumber: string;
    date: string;
    subtotal: number;
    totalDiscount?: number;
    totalTax?: number;
    totalAmount: number;
    cashReceived?: number;
    changeReturned?: number;
    paymentMethod: string;
    notes?: string;
  },
  items: SaleItem[],
  customerName?: string
) {
  return {
    invoiceNumber: sale.invoiceNumber,
    date: sale.date,
    items,
    subtotal: sale.subtotal,
    totalDiscount: sale.totalDiscount ?? 0,
    totalTax: sale.totalTax ?? 0,
    grandTotal: sale.totalAmount,
    cashReceived: sale.cashReceived ?? sale.totalAmount,
    change: sale.changeReturned ?? 0,
    paymentMethod: sale.paymentMethod,
    customerName,
  };
}

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

  // Payment verification state
  const [showVerify, setShowVerify] = useState(false);
  const [verifyAction, setVerifyAction] = useState<"print" | "save">("save");
  const [verifyUser, setVerifyUser] = useState("");
  const [verifyPass, setVerifyPass] = useState("");
  const [verifyError, setVerifyError] = useState(false);

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
      e.stopPropagation();
      commitEdit();
      // Tab-style navigation: move to next editable field
      const colIdx = editableCols.indexOf(col);
      if (colIdx < editableCols.length - 1) {
        setTimeout(() => startEditing(row, editableCols[colIdx + 1]), 0);
      } else if (row < items.length - 1) {
        setTimeout(() => startEditing(row + 1, editableCols[0]), 0);
      } else {
        searchRef.current?.focus();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      cancelEdit();
    } else if (e.key === "Tab") {
      e.stopPropagation();
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

  // Build current items snapshot for print/save callbacks
  const getCurrentItemsSnapshot = useCallback(() => [...items.map((i) => ({ ...i }))], [items]);

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
        handlePrintCurrent();
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
        handlePrintCurrent();
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

  // Get customer name by id
  const getCustomerName = useCallback(
    (cId: string) => {
      if (!customers || !cId) return undefined;
      const c = customers.find((c) => c._id === cId);
      return c?.name;
    },
    [customers]
  );

  // Print current unsaved cart (for Ctrl+Shift+P / Print button)
  const handlePrintCurrent = useCallback(() => {
    if (items.length === 0) {
      toast.error("No items to print. Add products first.");
      return;
    }
    const snapshot = getCurrentItemsSnapshot();
    const invNum = `PREVIEW-${Date.now()}`;
    const html = generateReceiptHTML({
      invoiceNumber: invNum,
      date: new Date().toLocaleString(),
      items: snapshot,
      subtotal,
      totalDiscount,
      totalTax,
      grandTotal,
      cashReceived: cashReceived || grandTotal,
      change,
      paymentMethod,
      customerName: getCustomerName(customerId),
    });
    const ok = printViaIframe(html);
    if (ok) toast.info("Print preview opened. Use the Print button in the preview to print.");
  }, [items, subtotal, totalDiscount, totalTax, grandTotal, cashReceived, change, paymentMethod, customerId, getCustomerName, getCurrentItemsSnapshot]);

  // Reprint a saved sale from history
  const handleReprint = useCallback(
    (sale: NonNullable<typeof saleList>[number]) => {
      // sale.items are the convex-stored items — they should contain the same structure
      const saleItems = (sale.items ?? []) as SaleItem[];
      if (saleItems.length === 0) {
        toast.error("No items found for this sale.");
        return;
      }
      const custName = sale.customerId ? getCustomerName(sale.customerId) : undefined;
      const html = generateReceiptHTML({
        invoiceNumber: sale.invoiceNumber,
        date: sale.date,
        items: saleItems,
        subtotal: sale.subtotal,
        totalDiscount: sale.totalDiscount ?? 0,
        totalTax: sale.totalTax ?? 0,
        grandTotal: sale.totalAmount,
        cashReceived: sale.cashReceived ?? sale.totalAmount,
        change: sale.changeReturned ?? 0,
        paymentMethod: sale.paymentMethod,
        customerName: custName,
      });
      const ok = printViaIframe(html);
      if (ok) toast.success(`Reprint: ${sale.invoiceNumber}`);
    },
    [getCustomerName]
  );

  // Save sale — returns invoice number for optional printing
  const handleSave = useCallback(
    async (shouldPrint = false): Promise<string | null> => {
      if (items.length === 0) {
        toast.error("Add at least one product");
        return null;
      }
      const snapshot = getCurrentItemsSnapshot();
      const sub = subtotal;
      const disc = totalDiscount;
      const tax = totalTax;
      const total = grandTotal;
      const ch = change;
      const payMethod = paymentMethod;
      const custId = customerId;
      const now = new Date();
      const invNum = `SALE-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`;
      try {
        await createSale({
          customerId: (custId || undefined) as Id<"customers"> | undefined,
          invoiceNumber: invNum,
          date: now.toISOString().split("T")[0],
          paymentMethod: payMethod,
          subtotal: sub,
          totalDiscount: disc || undefined,
          totalTax: tax || undefined,
          totalAmount: total,
          cashReceived: payMethod === "cash" ? cashReceived : undefined,
          changeReturned: payMethod === "cash" ? ch : undefined,
          notes: notes || undefined,
          items: snapshot,
        });
        await logActivity({ action: "Sale created", module: "sales", details: invNum });
        toast.success(`Sale saved! Invoice: ${invNum}`);

        // Print AFTER save succeeds, using the captured snapshot
        if (shouldPrint) {
          const html = generateReceiptHTML({
            invoiceNumber: invNum,
            date: now.toLocaleString(),
            items: snapshot,
            subtotal: sub,
            totalDiscount: disc,
            totalTax: tax,
            grandTotal: total,
            cashReceived: payMethod === "cash" ? cashReceived : total,
            change: ch,
            paymentMethod: payMethod,
            customerName: getCustomerName(custId),
          });
          const ok = printViaIframe(html);
          if (ok) toast.success(`Invoice ${invNum} sent to printer.`);
        }

        resetFormInternal();
        setShowPayment(false);
        return invNum;
      } catch (e) {
        toast.error(`Save failed: ${String(e)}`);
        return null;
      }
    },
    [items, customerId, paymentMethod, cashReceived, grandTotal, subtotal, totalDiscount, totalTax, change, notes, createSale, logActivity, getCustomerName, getCurrentItemsSnapshot]
  );

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

  // Reset form (internal — no toast)
  const resetFormInternal = useCallback(() => {
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

  // Close payment modal handler
  const handleClosePayment = useCallback(() => {
    setShowPayment(false);
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
            <Button onClick={handlePrintCurrent} className="nb-btn-outline text-xs">
              <Printer className="size-3 mr-1" /> Print
            </Button>
            <Button onClick={() => setShowHistory(!showHistory)} className="nb-btn-outline text-xs">
              <History className="size-3 mr-1" /> History
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

        {/* Sale History (reprint) */}
        {showHistory && (
          <Card className="nb-card-sm">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase">Recent Sales</span>
                <button onClick={() => setShowHistory(false)} className="text-xs text-muted-foreground hover:text-foreground">
                  Close
                </button>
              </div>
              <div className="max-h-48 overflow-auto">
                {saleList && saleList.length > 0 ? (
                  <table className="nb-table text-[10px]">
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Date</th>
                        <th className="text-right">Total</th>
                        <th>Payment</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {saleList.slice(0, 20).map((sale) => (
                        <tr key={sale._id}>
                          <td className="font-mono">{sale.invoiceNumber}</td>
                          <td>{sale.date}</td>
                          <td className="text-right">PKR {sale.totalAmount.toFixed(2)}</td>
                          <td>{sale.paymentMethod}</td>
                          <td>
                            <button
                              onClick={() => handleReprint(sale)}
                              className="text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1"
                              title="Reprint receipt"
                            >
                              <Printer className="size-3" /> Print
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">No sales yet.</p>
                )}
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) handleClosePayment(); }}>
          <Card className="nb-card w-full max-w-md mx-4">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold uppercase">Complete Payment</CardTitle>
              <button onClick={handleClosePayment} className="p-1 hover:bg-muted">
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
                <Button onClick={() => { setVerifyAction("print"); setVerifyUser(""); setVerifyPass(""); setVerifyError(false); setShowVerify(true); }} className="nb-btn flex-1 text-sm py-3">
                  <Printer className="size-4 mr-2" /> Save & Print
                </Button>
                <Button onClick={() => { setVerifyAction("save"); setVerifyUser(""); setVerifyPass(""); setVerifyError(false); setShowVerify(true); }} variant="outline" className="nb-btn-outline text-sm">
                  <Save className="size-4 mr-2" /> Save Only
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showVerify && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center">
          <Card className="nb-card w-full max-w-xs mx-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase">Verify Credentials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {verifyError && (
                <div className="text-xs font-bold text-red-600 bg-red-50 border-2 border-red-300 p-2">
                  Invalid username or password.
                </div>
              )}
              <div>
                <label className="text-xs font-bold">Username</label>
                <Input
                  value={verifyUser}
                  onChange={(e) => { setVerifyUser(e.target.value); setVerifyError(false); }}
                  className="nb-input text-sm mt-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const passEl = (e.target as HTMLElement).parentElement?.querySelector<HTMLInputElement>("input:nth-of-type(2)");
                      passEl?.focus();
                    }
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-bold">Password</label>
                <Input
                  type="password"
                  value={verifyPass}
                  onChange={(e) => { setVerifyPass(e.target.value); setVerifyError(false); }}
                  className="nb-input text-sm mt-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (verifyUser === "1" && verifyPass === "1") {
                        setShowVerify(false);
                        setShowPayment(false);
                        handleSave(verifyAction === "print");
                      } else {
                        setVerifyError(true);
                        setVerifyUser("");
                        setVerifyPass("");
                      }
                    } else if (e.key === "Escape") {
                      setShowVerify(false);
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (verifyUser === "1" && verifyPass === "1") {
                      setShowVerify(false);
                      setShowPayment(false);
                      handleSave(verifyAction === "print");
                    } else {
                      setVerifyError(true);
                      setVerifyUser("");
                      setVerifyPass("");
                    }
                  }}
                  className="nb-btn flex-1 text-xs"
                >
                  Verify
                </Button>
                <Button
                  onClick={() => setShowVerify(false)}
                  variant="outline"
                  className="nb-btn-outline text-xs"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
