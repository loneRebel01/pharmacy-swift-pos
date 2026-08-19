import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle, Package, ShoppingCart, ShoppingCartIcon, Users, Building2, ClipboardList, BarChart3 } from "lucide-react";
import { Link } from "react-router";

const modules = [
  { title: "Products", icon: Package, path: "/dashboard/products", desc: "Add, edit, and manage your product catalog with barcodes, batch tracking, and expiry dates." },
  { title: "Purchase / GRN", icon: ShoppingCart, path: "/dashboard/purchases", desc: "Fast keyboard-based goods receipt. Ctrl+P to search, Enter to select, type quantity, Enter to add." },
  { title: "POS / Sales", icon: ShoppingCartIcon, path: "/dashboard/pos", desc: "Point of Sale with barcode scanning, fast product search, and instant receipt printing." },
  { title: "Customers", icon: Users, path: "/dashboard/customers", desc: "Manage customer database with credit limits, balances, and purchase history." },
  { title: "Suppliers", icon: Building2, path: "/dashboard/suppliers", desc: "Manage suppliers with company details, balances, and purchase history." },
  { title: "Inventory", icon: ClipboardList, path: "/dashboard/inventory", desc: "Track stock levels, alerts for low/expired stock, and manage stock adjustments." },
  { title: "Reports", icon: BarChart3, path: "/dashboard/reports", desc: "Generate sales, purchase, inventory, profit/loss, and expiry reports with CSV and PDF export." },
];

export default function Help() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <HelpCircle className="size-6" />
        Help & Guide
      </h1>

      <Card className="nb-card">
        <CardHeader>
          <CardTitle className="text-sm font-bold">Getting Started</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p><strong>1. Add Products:</strong> Go to Products and add your pharmacy inventory with codes, barcodes, prices, and expiry dates.</p>
          <p><strong>2. Add Suppliers:</strong> Add your suppliers in the Suppliers module.</p>
          <p><strong>3. Make Purchases:</strong> Press F9, use Ctrl+P to search products, enter quantities, and save. Stock updates automatically.</p>
          <p><strong>4. Sell Products:</strong> Press F10 for POS. Scan barcodes or search by name. Fast keyboard workflow: search → enter → quantity → enter.</p>
          <p><strong>5. View Reports:</strong> Check daily/monthly sales, profit/loss, and inventory status.</p>
          <p><strong>6. Print Receipts:</strong> Every sale and purchase can be printed. Use Ctrl+Shift+P for quick print.</p>
        </CardContent>
      </Card>

      <Card className="nb-card">
        <CardHeader>
          <CardTitle className="text-sm font-bold">Fast Keyboard Workflow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="p-3 bg-muted border-2 border-border font-mono text-xs">
            <p>Purchase: F9 → Ctrl+P → type product → Enter → type quantity → Enter → next product → Ctrl+S → Ctrl+Shift+P</p>
            <p className="mt-2">POS: F10 → Ctrl+F → type product → Enter → quantity → Enter → next product → Ctrl+S → Ctrl+Shift+P</p>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-sm font-bold uppercase tracking-wider">Modules</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {modules.map((m) => (
          <Link key={m.path} to={m.path}>
            <Card className="nb-card-sm hover:shadow-[1px_1px_0px_0px_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer h-full">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <m.icon className="size-5" />
                  <span className="font-bold text-sm">{m.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">{m.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
