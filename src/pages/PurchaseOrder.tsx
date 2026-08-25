import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Save,
  X,
  FolderOpen,
  Search,
  Printer,
} from "lucide-react";

interface POItem {
  productId: Id<"products">;
  productName: string;
  soldQty: number;
  stockInHand: number;
  requiredPacks: number;
  customerDemand: number;
  packSize: number;
  purchasePrice: number;
  discount: number;
  minQty: number;
  bonusQty: number;
  netAmount: number;
  manufacturer: string;
}

export default function PurchaseOrderPage() {
  // ────── State ──────
  const [poNumber, setPoNumber] = useState(`PO-${Date.now()}`);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [fromDate, setFromDate] = useState(new Date().toISOString().split("T")[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [projectionDays, setProjectionDays] = useState(30);
  const [supplierId, setSupplierId] = useState<Id<"suppliers"> | "">("");
  const [poCategory, setPoCategory] = useState("");
  const [items, setItems] = useState<POItem[]>([]);
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [showOpenOrder, setShowOpenOrder] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<Id<"purchaseOrders"> | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const committedRef = useRef(true);

  // Filter state
  const [filterMode, setFilterMode] = useState<string>("soldQtyUnit");

  // ────── Queries ──────
  const lowStockProducts = useQuery(api.purchaseOrders.getLowStockProducts, {
    projectionDays,
  });
  const suppliers = useQuery(api.suppliers.list);
  const savedOrders = useQuery(api.purchaseOrders.list);

  // ────── Mutations ──────
  const createOrder = useMutation(api.purchaseOrders.create);
  const updateOrder = useMutation(api.purchaseOrders.update);
  const deleteOrder = useMutation(api.purchaseOrders.remove);

  // ────── Computed ──────
  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    return items.filter((item) =>
      item.productName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.netAmount, 0);
  }, [items]);

  const recalcItem = useCallback(
    (item: POItem): POItem => {
      const base = item.requiredPacks * item.purchasePrice;
      const discAmt = base * (item.discount / 100);
      const netAmount = base - discAmt;
      return { ...item, netAmount: Math.round(netAmount * 100) / 100 };
    },
    []
  );

  // ────── Open Order ──────
  const handleOpenOrder = useCallback(
    async (orderId: Id<"purchaseOrders">) => {
      const orderItems = await (async () => {
        const order = savedOrders?.find((o: any) => o._id === orderId);
        if (!order) return [];

        // Fetch items - we'll use a workaround since we can't directly call queries in callbacks
        // Instead, store the order data
        setCurrentOrderId(orderId);
        setPoNumber(order.poNumber);
        setDate(order.date);
        setFromDate(order.fromDate || order.date);
        setToDate(order.toDate || order.date);
        setProjectionDays(order.projectionDays || 30);
        setSupplierId(order.supplierId || "");
        setPoCategory(order.poCategory || "");
        setShowOpenOrder(false);
        toast.success("Order loaded");
      })();
    },
    [savedOrders]
  );

  // ────── Load items for opened order ──────
  const openedOrderItems = useQuery(
    api.purchaseOrders.getItems,
    currentOrderId ? { poId: currentOrderId } : "skip"
  );

  useEffect(() => {
    if (openedOrderItems && currentOrderId) {
      setItems(
        openedOrderItems.map((oi: any) => ({
          productId: oi.productId,
          productName: oi.productName,
          soldQty: oi.soldQty,
          stockInHand: oi.stockInHand,
          requiredPacks: oi.requiredPacks,
          customerDemand: oi.customerDemand,
          packSize: oi.packSize || 1,
          purchasePrice: oi.purchasePrice,
          discount: oi.discount || 0,
          minQty: oi.minQty || 0,
          bonusQty: oi.bonusQty || 0,
          netAmount: oi.netAmount,
          manufacturer: oi.manufacturer || "",
        }))
      );
    }
  }, [openedOrderItems, currentOrderId]);

  // ────── Add product to PO ──────
  const handleAddProduct = useCallback(() => {
    setSearchTerm("");
    // Scroll to search
  }, []);

  // ────── Select product from low-stock list ──────
  const handleSelectProduct = useCallback(
    (product: any) => {
      const exists = items.find((i) => i.productId === product._id);
      if (exists) {
        toast.info("Product already in the order");
        return;
      }
      const newItem: POItem = {
        productId: product._id,
        productName: product.name,
        soldQty: product.soldQty || 0,
        stockInHand: product.stockInHand || 0,
        requiredPacks: product.requiredPacks || 0,
        customerDemand: product.customerDemand || 0,
        packSize: product.packSize || 1,
        purchasePrice: product.purchasePrice || 0,
        discount: 0,
        minQty: product.minQty || 0,
        bonusQty: 0,
        netAmount: (product.requiredPacks || 0) * (product.purchasePrice || 0),
        manufacturer: product.manufacturer || "",
      };
      setItems((prev) => [...prev, newItem]);
      toast.success(`Added ${product.name}`);
    },
    [items]
  );

  // ────── Add custom product ──────
  const handleAddCustomProduct = useCallback(
    (productId: Id<"products">, name: string, price: number, mfg: string) => {
      const exists = items.find((i) => i.productId === productId);
      if (exists) {
        toast.info("Product already in the order");
        return;
      }
      const newItem: POItem = {
        productId,
        productName: name,
        soldQty: 0,
        stockInHand: 0,
        requiredPacks: 1,
        customerDemand: 0,
        packSize: 1,
        purchasePrice: price,
        discount: 0,
        minQty: 0,
        bonusQty: 0,
        netAmount: price,
        manufacturer: mfg,
      };
      setItems((prev) => [...prev, newItem]);
      toast.success(`Added ${name}`);
    },
    [items]
  );

  // ────── Delete row ──────
  const handleDeleteRow = useCallback(
    (rowIdx: number) => {
      setItems((prev) => prev.filter((_, i) => i !== rowIdx));
      setSelectedRow(null);
      toast.success("Row deleted");
    },
    []
  );

  // ────── Cell editing ──────
  const handleCellClick = useCallback(
    (rowIdx: number, col: string) => {
      if (editingCell) {
        commitEdit();
      }
      committedRef.current = true;
      setSelectedRow(rowIdx);
      const item = items[rowIdx];
      let val: string | number = "";
      switch (col) {
        case "requiredPacks": val = item.requiredPacks; break;
        case "purchasePrice": val = item.purchasePrice; break;
        case "discount": val = item.discount; break;
        case "minQty": val = item.minQty; break;
        case "bonusQty": val = item.bonusQty; break;
        default: val = "";
      }
      setEditingCell({ row: rowIdx, col });
      setEditValue(String(val));
    },
    [editingCell, items, editValue]
  );

  const commitEdit = useCallback(() => {
    if (!editingCell) return;
    const numVal = parseFloat(editValue) || 0;
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== editingCell.row) return item;
        const updated = { ...item, [editingCell.col]: numVal };
        return recalcItem(updated);
      })
    );
    setEditingCell(null);
    setEditValue("");
    committedRef.current = true;
  }, [editingCell, editValue, recalcItem]);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        commitEdit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setEditingCell(null);
        setEditValue("");
        committedRef.current = true;
      }
    },
    [commitEdit]
  );

  // ────── Save ──────
  const handleSave = useCallback(async () => {
    if (items.length === 0) {
      toast.error("Add at least one product to save");
      return;
    }
    try {
      const data = {
        poNumber,
        date,
        supplierId: supplierId || undefined,
        poCategory: poCategory || undefined,
        projectionDays,
        fromDate,
        toDate,
        totalAmount,
        status: "draft",
        items: items.map((item) => ({
          ...item,
          packSize: item.packSize || undefined,
          discount: item.discount || undefined,
          minQty: item.minQty || undefined,
          bonusQty: item.bonusQty || undefined,
          manufacturer: item.manufacturer || undefined,
        })),
      };
      if (currentOrderId) {
        await updateOrder({ id: currentOrderId, ...data });
        toast.success("Purchase Order updated");
      } else {
        const id = await createOrder(data);
        setCurrentOrderId(id);
        toast.success("Purchase Order saved");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    }
  }, [items, poNumber, date, supplierId, poCategory, projectionDays, fromDate, toDate, totalAmount, currentOrderId, createOrder, updateOrder]);

  // ────── Print ──────
  const handlePrint = useCallback(() => {
    if (items.length === 0) {
      toast.error("No items to print");
      return;
    }
    const pharmacyName = localStorage.getItem("pharmacy_name") || "Free Buff Pharmacy";
    const pharmacyPhone = localStorage.getItem("pharmacy_phone") || "";
    const pharmacyAddress = localStorage.getItem("pharmacy_address") || "";
    const receiptWidth = localStorage.getItem("receipt_width") || "A4";
    const supplierName = suppliers?.find((s: any) => s._id === supplierId)?.name || "N/A";
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Purchase Order ${poNumber}</title>
        <style>
          @page { size: ${receiptWidth === 'A4' ? 'A4' : receiptWidth}; margin: 10mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
          .header h1 { font-size: 18px; font-weight: bold; }
          .header p { font-size: 11px; margin-top: 2px; }
          .info { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 11px; }
          .info div { flex: 1; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { background: #f0f0f0; border: 1px solid #000; padding: 5px 6px; text-align: left; font-size: 10px; font-weight: bold; text-transform: uppercase; }
          td { border: 1px solid #000; padding: 4px 6px; font-size: 10px; }
          .text-right { text-align: right; }
          .total-row td { font-weight: bold; border-top: 2px solid #000; font-size: 12px; }
          .footer { margin-top: 20px; border-top: 1px solid #000; padding-top: 10px; font-size: 10px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
          .sig-line { width: 40%; border-top: 1px solid #000; padding-top: 5px; font-size: 10px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${pharmacyName}</h1>
          ${pharmacyAddress ? `<p>${pharmacyAddress}</p>` : ''}
          ${pharmacyPhone ? `<p>Phone: ${pharmacyPhone}</p>` : ''}
          <h2 style="margin-top:8px;font-size:14px;">PURCHASE ORDER</h2>
        </div>
        <div class="info">
          <div><strong>PO No:</strong> ${poNumber}</div>
          <div><strong>Date:</strong> ${date}</div>
          <div><strong>Category:</strong> ${poCategory || 'N/A'}</div>
        </div>
        <div class="info">
          <div><strong>Supplier:</strong> ${supplierName}</div>
          <div><strong>Projection:</strong> ${projectionDays} days</div>
          <div><strong>Period:</strong> ${fromDate} to ${toDate}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Product</th>
              <th class="text-right">Sold Qty</th>
              <th class="text-right">Stock</th>
              <th class="text-right">Req. Pkts</th>
              <th class="text-right">Pkt Size</th>
              <th class="text-right">Pur. Price</th>
              <th class="text-right">Disc%</th>
              <th class="text-right">Net Amt</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${item.productName}</td>
                <td class="text-right">${item.soldQty}</td>
                <td class="text-right">${item.stockInHand}</td>
                <td class="text-right">${item.requiredPacks}</td>
                <td class="text-right">${item.packSize}</td>
                <td class="text-right">Rs ${item.purchasePrice.toFixed(2)}</td>
                <td class="text-right">${item.discount}%</td>
                <td class="text-right">Rs ${item.netAmount.toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="8" class="text-right">TOTAL</td>
              <td class="text-right">Rs ${totalAmount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        <div class="signatures">
          <div class="sig-line">Authorized By</div>
          <div class="sig-line">Supplier Signature</div>
        </div>
      </body>
      </html>
    `;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(receiptHTML);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 300);
    } else {
      toast.error('Could not generate print preview');
      document.body.removeChild(iframe);
    }
  }, [items, poNumber, date, fromDate, toDate, projectionDays, supplierId, poCategory, totalAmount, suppliers]);

  // ────── New ──────
  const handleNew = useCallback(() => {
    setPoNumber(`PO-${Date.now()}`);
    setDate(new Date().toISOString().split("T")[0]);
    setFromDate(new Date().toISOString().split("T")[0]);
    setToDate(new Date().toISOString().split("T")[0]);
    setProjectionDays(30);
    setSupplierId("");
    setPoCategory("");
    setItems([]);
    setCurrentOrderId(null);
    setSelectedRow(null);
    setEditingCell(null);
  }, []);

  // ────── Filter options ──────
  const filterButtons = [
    { key: "deadItems", label: "Dead Items / Stock Zero" },
    { key: "soldQtyPack", label: "Sold Qty (Pack)" },
    { key: "soldQtyUnit", label: "Sold Qty (Unit)" },
    { key: "stockInHandPack", label: "Stock in Hand (Pack)" },
    { key: "stockInHandUnit", label: "Stock in Hand (Unit)" },
    { key: "customerDemand", label: "Customer Demand (Unit)" },
  ];

  // ────── Load all products for adding ──────
  const allProducts = useQuery(api.products.list);

  // Filter for product search dropdown
  const [productSearch, setProductSearch] = useState("");
  const productSearchResults = useMemo(() => {
    if (!productSearch || productSearch.length < 2) return [];
    return        (allProducts || [])
      .filter(
        (p: any) =>
          p.isActive &&
          p.name.toLowerCase().includes(productSearch.toLowerCase())
      )
      .slice(0, 20);
  }, [productSearch, allProducts]);

  // ────── Keyboard nav ──────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
      if (e.key === "F2") { e.preventDefault(); handleNew(); }
      if (e.key === "F3") { e.preventDefault(); handleAddProduct(); }
      if (e.key === "F4") { e.preventDefault(); setShowOpenOrder(true); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleNew, handleAddProduct]);

  // ────── Table column definitions ──────
  const tableCols = [
    { key: "sr", label: "Sr.No", width: "w-12", editable: false },
    { key: "productName", label: "Product Name", width: "min-w-[180px]", editable: false },
    { key: "soldQty", label: "Sold Qty", width: "w-20", editable: false },
    { key: "stockInHand", label: "Stock in Hand", width: "w-24", editable: false },
    { key: "requiredPacks", label: "Required Pack(s)", width: "w-28", editable: true },
    { key: "customerDemand", label: "Customer Demand", width: "w-28", editable: false },
    { key: "packSize", label: "Pack Size", width: "w-20", editable: false },
    { key: "purchasePrice", label: "Purchase Price", width: "w-24", editable: true },
    { key: "discount", label: "Disc (%)", width: "w-20", editable: true },
    { key: "minQty", label: "Min Qty", width: "w-20", editable: true },
    { key: "bonusQty", label: "Bonus Qty", width: "w-20", editable: true },
    { key: "netAmount", label: "Net Amount", width: "w-24", editable: false },
    { key: "manufacturer", label: "Manufacturer", width: "min-w-[140px]", editable: false },
  ];

  const getCellValue = (item: POItem, key: string): string => {
    switch (key) {
      case "sr": return "";
      case "productName": return item.productName;
      case "soldQty": return String(item.soldQty);
      case "stockInHand": return String(item.stockInHand);
      case "requiredPacks": return String(item.requiredPacks);
      case "customerDemand": return String(item.customerDemand);
      case "packSize": return String(item.packSize);
      case "purchasePrice": return String(item.purchasePrice);
      case "discount": return String(item.discount);
      case "minQty": return String(item.minQty);
      case "bonusQty": return String(item.bonusQty);
      case "netAmount": return String(item.netAmount.toFixed(2));
      case "manufacturer": return item.manufacturer;
      default: return "";
    }
  };

  return (
    <div className="h-full flex flex-col gap-3">
      {/* ──── Header ──── */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold uppercase tracking-wide">
          Purchase Order
        </h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="nb-btn" onClick={handleNew}>
            New (F2)
          </Button>
          <Button size="sm" variant="outline" className="nb-btn" onClick={() => setShowOpenOrder(true)}>
            <FolderOpen className="size-3 mr-1" /> Open Order (F4)
          </Button>
          <Button size="sm" className="nb-btn nb-btn-primary" onClick={handleSave}>
            <Save className="size-3 mr-1" /> Save
          </Button>
          <Button size="sm" variant="outline" className="nb-btn" onClick={handlePrint}>
            <Printer className="size-3 mr-1" /> Print
          </Button>
          <Button size="sm" variant="outline" className="nb-btn" onClick={handleNew}>
            <X className="size-3 mr-1" /> Exit
          </Button>
        </div>
      </div>

      {/* ──── PO Info Fields ──── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <div>
          <label className="text-[10px] font-bold uppercase text-muted-foreground">PO No</label>
          <Input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} className="nb-input h-8 text-xs" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-muted-foreground">Date</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="nb-input h-8 text-xs" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-muted-foreground">Projection Days</label>
          <Input type="number" value={projectionDays} onChange={(e) => setProjectionDays(parseInt(e.target.value) || 0)} className="nb-input h-8 text-xs" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-muted-foreground">From Date</label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="nb-input h-8 text-xs" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-muted-foreground">To Date</label>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="nb-input h-8 text-xs" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-muted-foreground">Supplier</label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value as any)}
            className="nb-input h-8 text-xs w-full"
          >
            <option value="">Select Supplier</option>
            {suppliers?.map((s: any) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ──── PO Category ──── */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] font-bold uppercase text-muted-foreground">PO Category</label>
          <select
            value={poCategory}
            onChange={(e) => setPoCategory(e.target.value)}
            className="nb-input h-8 text-xs w-full"
          >
            <option value="">Select Category</option>
            <option value="regular">Regular</option>
            <option value="urgent">Urgent</option>
            <option value="seasonal">Seasonal</option>
            <option value="special">Special Order</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-[10px] font-bold uppercase text-muted-foreground">Search Products</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setProductSearch(e.target.value);
                }}
                placeholder="Type to filter products in table..."
                className="nb-input h-8 text-xs"
              />
              {productSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-30 bg-card border-2 border-border max-h-48 overflow-auto">
                  {productSearchResults.map((p: any) => (
                    <button
                      key={p._id}
                      className="w-full text-left px-2 py-1 text-xs hover:bg-muted border-b border-border last:border-0"
                      onClick={() => {
                        handleAddCustomProduct(p._id, p.name, p.purchasePrice, p.manufacturer || "");
                        setProductSearch("");
                      }}
                    >
                      {p.name} — Rs {p.purchasePrice}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button size="sm" className="nb-btn nb-btn-primary" onClick={handleAddProduct}>
              <Plus className="size-3 mr-1" /> Add
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="nb-btn"
              onClick={() => {
                if (selectedRow !== null) handleDeleteRow(selectedRow);
              }}
            >
              <Trash2 className="size-3 mr-1" /> Delete
            </Button>
          </div>
        </div>
      </div>

      {/* ──── Filter Buttons ──── */}
      <div className="flex flex-wrap gap-1">
        {filterButtons.map((f) => (
          <button
            key={f.key}
            className={`px-2 py-1 text-[10px] font-bold uppercase border-2 transition-all ${
              filterMode === f.key
                ? "bg-accent border-border"
                : "bg-card border-transparent hover:border-border"
            }`}
            onClick={() => setFilterMode(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ──── Main Table ──── */}
      <div className="flex-1 overflow-auto border-2 border-border bg-card">
        <table className="nb-table text-xs w-full">
          <thead>
            <tr>
              {tableCols.map((col) => (
                <th
                  key={col.key}
                  className={`${col.width} px-2 py-1.5 text-left text-[10px] font-bold uppercase bg-muted border-b-2 border-border`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td
                  colSpan={tableCols.length}
                  className="px-2 py-8 text-center text-muted-foreground"
                >
                  No products in this Purchase Order. Use the search above to add products.
                </td>
              </tr>
            ) : (
              filteredItems.map((item, rowIdx) => {
                const realIdx = items.indexOf(item);
                return (
                  <tr
                    key={`${item.productId}-${rowIdx}`}
                    className={`border-b border-border cursor-pointer ${
                      selectedRow === realIdx ? "bg-accent" : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedRow(realIdx)}
                  >
                    {tableCols.map((col) => {
                      const isEditing =
                        editingCell?.row === realIdx && editingCell?.col === col.key;
                      const isSelected =
                        selectedRow === realIdx && editingCell?.col === col.key;

                      return (
                        <td
                          key={col.key}
                          className={`px-2 py-1 border-r border-border last:border-r-0 ${
                            col.editable
                              ? "cursor-pointer hover:bg-accent/50"
                              : ""
                          } ${
                            isSelected && !isEditing
                              ? "ring-2 ring-primary ring-inset"
                              : ""
                          }`}
                          onClick={() =>
                            col.editable && handleCellClick(realIdx, col.key)
                          }
                        >
                          {col.key === "sr" ? (
                            rowIdx + 1
                          ) : isEditing ? (
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleEditKeyDown}
                              onBlur={() => {
                                if (!committedRef.current) {
                                  commitEdit();
                                }
                                committedRef.current = true;
                              }}
                              autoFocus
                              className="w-full bg-background border-2 border-primary px-1 py-0.5 text-xs font-mono outline-none"
                            />
                          ) : (
                            <span className={col.key === "netAmount" ? "font-bold" : ""}>
                              {col.key === "purchasePrice" || col.key === "netAmount"
                                ? `Rs ${getCellValue(item, col.key)}`
                                : getCellValue(item, col.key)}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ──── Bottom Bar: Total ──── */}
      <div className="flex items-center justify-between border-2 border-border bg-card px-4 py-2">
        <div className="text-xs text-muted-foreground">
          Total Items: <span className="font-bold text-foreground">{items.length}</span>
        </div>
        <div className="text-sm font-bold">
          Total Amount:{" "}
          <span className="text-lg">Rs {totalAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* ──── Open Order Modal ──── */}
      {showOpenOrder && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowOpenOrder(false);
          }}
        >
          <Card className="nb-card w-full max-w-2xl mx-4">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold uppercase">
                Open Purchase Order
              </CardTitle>
              <button onClick={() => setShowOpenOrder(false)} className="nb-btn p-1">
                <X className="size-4" />
              </button>
            </CardHeader>
            <CardContent className="max-h-96 overflow-auto">
              {savedOrders && savedOrders.length > 0 ? (
                <table className="nb-table text-xs w-full">
                  <thead>
                    <tr>
                      <th className="px-2 py-1 text-left text-[10px] font-bold uppercase bg-muted border-b-2 border-border">
                        PO No
                      </th>
                      <th className="px-2 py-1 text-left text-[10px] font-bold uppercase bg-muted border-b-2 border-border">
                        Date
                      </th>
                      <th className="px-2 py-1 text-left text-[10px] font-bold uppercase bg-muted border-b-2 border-border">
                        Category
                      </th>
                      <th className="px-2 py-1 text-right text-[10px] font-bold uppercase bg-muted border-b-2 border-border">
                        Total
                      </th>
                      <th className="px-2 py-1 text-left text-[10px] font-bold uppercase bg-muted border-b-2 border-border">
                        Status
                      </th>
                      <th className="px-2 py-1 text-center text-[10px] font-bold uppercase bg-muted border-b-2 border-border">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedOrders.map((order: any) => (
                      <tr key={order._id} className="border-b border-border hover:bg-muted/50">
                        <td className="px-2 py-1 font-mono">{order.poNumber}</td>
                        <td className="px-2 py-1">{order.date}</td>
                        <td className="px-2 py-1">{order.poCategory || "-"}</td>
                        <td className="px-2 py-1 text-right font-bold">
                          Rs {order.totalAmount.toFixed(2)}
                        </td>
                        <td className="px-2 py-1">
                          <span className="nb-badge">{order.status}</span>
                        </td>
                        <td className="px-2 py-1 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="nb-btn h-6 text-[10px]"
                            onClick={() => handleOpenOrder(order._id)}
                          >
                            Open
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center text-muted-foreground py-8 text-xs">
                  No saved Purchase Orders found.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
