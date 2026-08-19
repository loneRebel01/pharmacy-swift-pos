import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  ShoppingCart,
  Users,
  Building2,
  AlertTriangle,
  Clock,
  TrendingUp,
  DollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  ShoppingCartIcon,
  ClipboardList,
  Keyboard,
} from "lucide-react";
import { Link } from "react-router";

export default function Dashboard() {
  const productStats = useQuery(api.products.getStats);
  const purchaseStats = useQuery(api.purchases.getStats);
  const salesStats = useQuery(api.sales.getStats);
  const customerStats = useQuery(api.customers.getStats);
  const supplierStats = useQuery(api.suppliers.getStats);
  const recentSales = useQuery(api.sales.list);
  const recentPurchases = useQuery(api.purchases.list);

  const today = new Date().toISOString().split("T")[0];

  const stats = [
    {
      title: "Today's Sales",
      value: `PKR ${(salesStats?.todayTotal ?? 0).toLocaleString()}`,
      icon: DollarSign,
      color: "bg-green-100",
      link: "/dashboard/pos",
    },
    {
      title: "Today's Purchases",
      value: `PKR ${(purchaseStats?.todayTotal ?? 0).toLocaleString()}`,
      icon: ShoppingCart,
      color: "bg-blue-100",
      link: "/dashboard/purchases",
    },
    {
      title: "Total Products",
      value: productStats?.total ?? 0,
      icon: Package,
      color: "bg-purple-100",
      link: "/dashboard/products",
    },
    {
      title: "Low Stock",
      value: productStats?.lowStock ?? 0,
      icon: AlertTriangle,
      color: "bg-yellow-100",
      link: "/dashboard/products",
    },
    {
      title: "Expired Products",
      value: productStats?.expired ?? 0,
      icon: Clock,
      color: "bg-red-100",
      link: "/dashboard/products",
    },
    {
      title: "Total Customers",
      value: customerStats?.total ?? 0,
      icon: Users,
      color: "bg-cyan-100",
      link: "/dashboard/customers",
    },
    {
      title: "Total Suppliers",
      value: supplierStats?.total ?? 0,
      icon: Building2,
      color: "bg-orange-100",
      link: "/dashboard/suppliers",
    },
    {
      title: "Monthly Sales",
      value: `PKR ${(salesStats?.monthTotal ?? 0).toLocaleString()}`,
      icon: TrendingUp,
      color: "bg-emerald-100",
      link: "/dashboard/reports",
    },
  ];

  const quickActions = [
    { label: "New Purchase", icon: ShoppingCart, path: "/dashboard/purchases", key: "F9", color: "nb-btn-accent" },
    { label: "Open POS", icon: ShoppingCartIcon, path: "/dashboard/pos", key: "F10", color: "nb-btn" },
    { label: "Products", icon: Package, path: "/dashboard/products", key: "F2", color: "nb-btn-outline" },
    { label: "Inventory", icon: ClipboardList, path: "/dashboard/inventory", key: "F8", color: "nb-btn-outline" },
    { label: "Reports", icon: BarChart3, path: "/dashboard/reports", key: "", color: "nb-btn-outline" },
    { label: "Shortcuts", icon: Keyboard, path: "/dashboard/shortcuts", key: "", color: "nb-btn-outline" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <span className="text-sm text-muted-foreground font-mono">
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <Link key={stat.title} to={stat.link}>
            <Card className="nb-card-sm hover:shadow-[1px_1px_0px_0px_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer h-full">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stat.title}</p>
                    <p className="text-xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-2 border-2 border-border ${stat.color}`}>
                    <stat.icon className="size-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.path}
              className={`${action.color} flex flex-col items-center gap-2 py-4 px-2 text-center`}
            >
              <action.icon className="size-6" />
              <span className="text-xs font-bold">{action.label}</span>
              {action.key && (
                <span className="text-[10px] opacity-60 font-mono border-2 border-border px-1 bg-muted">
                  {action.key}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Sales */}
        <Card className="nb-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Recent Sales</CardTitle>
          </CardHeader>
          <CardContent>
            {(!recentSales || recentSales.length === 0) ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No sales yet</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-auto">
                {recentSales.slice(0, 10).map((sale) => (
                  <div key={sale._id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-semibold">{sale.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">{sale.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">PKR {sale.totalAmount.toLocaleString()}</p>
                      <span className={`nb-badge text-[10px] ${sale.status === "completed" ? "bg-green-100" : "bg-yellow-100"}`}>
                        {sale.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Purchases */}
        <Card className="nb-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Recent Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            {(!recentPurchases || recentPurchases.length === 0) ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No purchases yet</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-auto">
                {recentPurchases.slice(0, 10).map((purchase) => (
                  <div key={purchase._id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-semibold">{purchase.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">{purchase.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">PKR {purchase.totalAmount.toLocaleString()}</p>
                      <span className={`nb-badge text-[10px] ${purchase.status === "completed" ? "bg-green-100" : "bg-yellow-100"}`}>
                        {purchase.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
