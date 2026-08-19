import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Building2,
  BarChart3,
  Settings,
  Keyboard,
  Menu,
  X,
  LogOut,
  ShoppingCartIcon,
  ClipboardList,
  ArrowDownCircle,
  ArrowUpCircle,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, key: "F12" },
  { path: "/dashboard/products", label: "Products", icon: Package, key: "F2" },
  { path: "/dashboard/purchases", label: "Purchases", icon: ShoppingCart, key: "F9" },
  { path: "/dashboard/pos", label: "POS / Sales", icon: ShoppingCartIcon, key: "F10" },
  { path: "/dashboard/customers", label: "Customers", icon: Users, key: "F6" },
  { path: "/dashboard/suppliers", label: "Suppliers", icon: Building2, key: "F7" },
  { path: "/dashboard/inventory", label: "Inventory", icon: ClipboardList, key: "F8" },
  { path: "/dashboard/stock-in", label: "Stock In", icon: ArrowDownCircle, key: "" },
  { path: "/dashboard/stock-out", label: "Stock Out", icon: ArrowUpCircle, key: "" },
  { path: "/dashboard/reports", label: "Reports", icon: BarChart3, key: "" },
  { path: "/dashboard/shortcuts", label: "Shortcuts", icon: Keyboard, key: "" },
  { path: "/dashboard/settings", label: "Settings", icon: Settings, key: "" },
  { path: "/dashboard/help", label: "Help", icon: HelpCircle, key: "F1" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't intercept if user is in an input
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        if (e.key === "Escape") {
          (e.target as HTMLElement).blur();
          e.preventDefault();
        }
        return;
      }

      if (e.key === "F1") { e.preventDefault(); navigate("/dashboard/help"); }
      if (e.key === "F2") { e.preventDefault(); navigate("/dashboard/products"); }
      if (e.key === "F6") { e.preventDefault(); navigate("/dashboard/customers"); }
      if (e.key === "F7") { e.preventDefault(); navigate("/dashboard/suppliers"); }
      if (e.key === "F8") { e.preventDefault(); navigate("/dashboard/inventory"); }
      if (e.key === "F9") { e.preventDefault(); navigate("/dashboard/purchases"); }
      if (e.key === "F10") { e.preventDefault(); navigate("/dashboard/pos"); }
      if (e.key === "F12") { e.preventDefault(); navigate("/dashboard"); }
    },
    [navigate]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative z-50 h-full bg-card border-r-2 border-border
          transition-all duration-200 flex flex-col
          ${sidebarOpen ? "w-64" : "w-16"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-3 border-b-2 border-border">
          {sidebarOpen ? (
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-accent border-2 border-border flex items-center justify-center font-bold text-sm">
                FB
              </div>
              <span className="font-bold text-sm">Free Buff Pharmacy</span>
            </Link>
          ) : (
            <Link to="/dashboard" className="flex justify-center w-full">
              <div className="w-8 h-8 bg-accent border-2 border-border flex items-center justify-center font-bold text-sm">
                FB
              </div>
            </Link>
          )}
          <button
            className="lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== "/dashboard" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nb-sidebar-item mx-2 ${isActive ? "active" : ""}`}
                onClick={() => setMobileOpen(false)}
                title={item.label}
              >
                <item.icon className="size-4 shrink-0" />
                {sidebarOpen && (
                  <>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.key && (
                      <span className="text-[10px] opacity-60 font-mono">{item.key}</span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t-2 border-border p-2">
          {sidebarOpen ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 bg-muted border-2 border-border flex items-center justify-center text-xs font-bold shrink-0">
                  {user?.name?.[0] || "U"}
                </div>
                <span className="text-xs font-medium truncate">{user?.name || "User"}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="p-1 hover:bg-muted border-2 border-transparent hover:border-border transition-all"
                title="Sign Out"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignOut}
              className="w-full flex justify-center p-1 hover:bg-muted border-2 border-transparent hover:border-border transition-all"
              title="Sign Out"
            >
              <LogOut className="size-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-12 border-b-2 border-border bg-card flex items-center px-4 gap-4 shrink-0">
          <button
            onClick={() => {
              if (window.innerWidth < 1024) setMobileOpen(!mobileOpen);
              else setSidebarOpen(!sidebarOpen);
            }}
            className="p-1 hover:bg-muted border-2 border-transparent hover:border-border transition-all"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-xs">
            <span className="nb-badge bg-muted text-muted-foreground">
              {user?.role ? String(user.role).toUpperCase() : "USER"}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </div>
    </div>
  );
}
