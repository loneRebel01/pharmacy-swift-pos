import { useState, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Download, FileText, Table } from "lucide-react";
import { toast } from "sonner";

type ReportType = "daily_sales" | "monthly_sales" | "purchase" | "inventory" | "profit_loss" | "expired" | "low_stock";

export default function Reports() {
  const sales = useQuery(api.sales.list);
  const purchases = useQuery(api.purchases.list);
  const products = useQuery(api.products.list);
  const [activeReport, setActiveReport] = useState<ReportType>("daily_sales");

  const today = new Date().toISOString().split("T")[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

  const getReportData = useCallback(() => {
    const completedSales = (sales ?? []).filter((s) => s.status === "completed");
    const completedPurchases = (purchases ?? []).filter((p) => p.status === "completed");
    const activeProducts = (products ?? []).filter((p) => p.isActive);

    switch (activeReport) {
      case "daily_sales": {
        const todaySales = completedSales.filter((s) => s.date === today);
        return {
          title: "Daily Sales Report",
          headers: ["Invoice", "Date", "Payment", "Total"],
          rows: todaySales.map((s) => [s.invoiceNumber, s.date, s.paymentMethod, `PKR ${s.totalAmount.toLocaleString()}`]),
          summary: { label: "Total", value: `PKR ${todaySales.reduce((sum, s) => sum + s.totalAmount, 0).toLocaleString()}` },
        };
      }
      case "monthly_sales": {
        const monthSales = completedSales.filter((s) => s.date >= monthStart);
        return {
          title: "Monthly Sales Report",
          headers: ["Invoice", "Date", "Payment", "Total"],
          rows: monthSales.map((s) => [s.invoiceNumber, s.date, s.paymentMethod, `PKR ${s.totalAmount.toLocaleString()}`]),
          summary: { label: "Total", value: `PKR ${monthSales.reduce((sum, s) => sum + s.totalAmount, 0).toLocaleString()}` },
        };
      }
      case "purchase": {
        return {
          title: "Purchase Report",
          headers: ["Invoice", "Date", "Payment", "Total"],
          rows: completedPurchases.map((p) => [p.invoiceNumber, p.date, p.paymentMode, `PKR ${p.totalAmount.toLocaleString()}`]),
          summary: { label: "Total", value: `PKR ${completedPurchases.reduce((sum, p) => sum + p.totalAmount, 0).toLocaleString()}` },
        };
      }
      case "inventory": {
        return {
          title: "Inventory Report",
          headers: ["Code", "Name", "Stock", "Purchase Price", "Retail Price", "Value"],
          rows: activeProducts.map((p) => [p.code, p.name, String(p.currentStock), `PKR ${p.purchasePrice}`, `PKR ${p.retailPrice}`, `PKR ${(p.purchasePrice * p.currentStock).toLocaleString()}`]),
          summary: { label: "Total Value", value: `PKR ${activeProducts.reduce((sum, p) => sum + p.purchasePrice * p.currentStock, 0).toLocaleString()}` },
        };
      }
      case "profit_loss": {
        const monthSales = completedSales.filter((s) => s.date >= monthStart);
        const monthPurchases = completedPurchases.filter((p) => p.date >= monthStart);
        const totalSalesAmount = monthSales.reduce((sum, s) => sum + s.totalAmount, 0);
        const totalPurchaseAmount = monthPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
        const profit = totalSalesAmount - totalPurchaseAmount;
        return {
          title: "Profit & Loss Report",
          headers: ["Category", "Amount"],
          rows: [
            ["Monthly Sales", `PKR ${totalSalesAmount.toLocaleString()}`],
            ["Monthly Purchases", `PKR ${totalPurchaseAmount.toLocaleString()}`],
            ["Gross Profit", `PKR ${profit.toLocaleString()}`],
          ],
          summary: { label: "Net Profit", value: `PKR ${profit.toLocaleString()}` },
        };
      }
      case "expired": {
        const expired = activeProducts.filter((p) => p.expiryDate && p.expiryDate <= today);
        return {
          title: "Expired Products Report",
          headers: ["Code", "Name", "Batch", "Expiry", "Stock"],
          rows: expired.map((p) => [p.code, p.name, p.batchNumber ?? "-", p.expiryDate ?? "-", String(p.currentStock)]),
          summary: { label: "Count", value: String(expired.length) },
        };
      }
      case "low_stock": {
        const lowStock = activeProducts.filter((p) => p.minimumStock !== undefined && p.currentStock <= p.minimumStock);
        return {
          title: "Low Stock Products Report",
          headers: ["Code", "Name", "Current Stock", "Minimum Stock"],
          rows: lowStock.map((p) => [p.code, p.name, String(p.currentStock), String(p.minimumStock ?? 0)]),
          summary: { label: "Count", value: String(lowStock.length) },
        };
      }
    }
  }, [activeReport, sales, purchases, products, today, monthStart]);

  const report = getReportData();

  const exportCSV = useCallback(() => {
    if (!report) return;
    const csv = [report.headers, ...report.rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeReport}-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported as CSV");
  }, [report, activeReport, today]);

  const exportPDF = useCallback(() => {
    if (!report) return;
    const content = `
      <html><head><title>${report.title}</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:12px;margin:20px;}
        h1{font-size:18px;border-bottom:2px solid #000;padding-bottom:8px;}
        table{width:100%;border-collapse:collapse;margin:16px 0;}
        th,td{border:1px solid #000;padding:6px 8px;text-align:left;font-size:11px;}
        th{background:#f0f0f0;font-weight:bold;}
        .summary{text-align:right;font-weight:bold;font-size:14px;margin-top:12px;padding-top:8px;border-top:2px solid #000;}
      </style></head><body>
        <h1>${report.title}</h1>
        <p>Date: ${new Date().toLocaleDateString()}</p>
        <table><thead><tr>${report.headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>${report.rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>
        <div class="summary">${report.summary.label}: ${report.summary.value}</div>
        <p style="text-align:center;margin-top:24px;color:#666;">Free Buff Pharmacy - Report</p>
      </body></html>
    `;
    const w = window.open("", "_blank");
    if (w) { w.document.write(content); w.document.close(); w.print(); }
    toast.success("PDF preview opened");
  }, [report]);

  const reports: { key: ReportType; label: string }[] = [
    { key: "daily_sales", label: "Daily Sales" },
    { key: "monthly_sales", label: "Monthly Sales" },
    { key: "purchase", label: "Purchases" },
    { key: "inventory", label: "Inventory" },
    { key: "profit_loss", label: "Profit & Loss" },
    { key: "expired", label: "Expired" },
    { key: "low_stock", label: "Low Stock" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="size-6" /> Reports</h1>
        <div className="flex gap-2">
          <Button onClick={exportCSV} className="nb-btn-outline text-xs"><Download className="size-3 mr-1" /> CSV</Button>
          <Button onClick={exportPDF} className="nb-btn-outline text-xs"><FileText className="size-3 mr-1" /> PDF / Print</Button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex flex-wrap gap-2">
        {reports.map((r) => (
          <button
            key={r.key}
            onClick={() => setActiveReport(r.key)}
            className={`nb-btn-outline text-xs px-3 py-1.5 ${activeReport === r.key ? "bg-accent" : ""}`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Report Table */}
      <Card className="nb-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold uppercase">{report.title}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[calc(100vh-320px)]">
            <table className="nb-table">
              <thead>
                <tr>{report.headers.map((h) => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {report.rows.length === 0 ? (
                  <tr><td colSpan={report.headers.length} className="text-center py-8 text-muted-foreground">No data available</td></tr>
                ) : report.rows.map((row, i) => (
                  <tr key={i}>{row.map((cell, j) => <td key={j} className="text-xs">{cell}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t-2 border-border flex justify-end">
            <span className="text-sm font-bold">{report.summary.label}: {report.summary.value}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
