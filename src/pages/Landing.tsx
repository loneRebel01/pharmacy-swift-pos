import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Pill,
  ShoppingCart,
  Barcode,
  Printer,
  BarChart3,
  Shield,
  Keyboard,
  ArrowRight,
  Zap,
  Check,
} from "lucide-react";
import { Link } from "react-router";

const features = [
  { icon: ShoppingCart, title: "Fast POS", desc: "Keyboard-first point of sale with barcode scanning. Complete a sale without touching the mouse." },
  { icon: ShoppingCart, title: "Purchase GRN", desc: "Professional goods receipt with instant product search, financial calculations, and batch tracking." },
  { icon: Pill, title: "Product Management", desc: "Complete product catalog with barcodes, expiry tracking, batch numbers, and multi-price support." },
  { icon: BarChart3, title: "Reports & Analytics", desc: "Daily/monthly sales, profit & loss, inventory, and expiry reports with CSV and PDF export." },
  { icon: Shield, title: "Security", desc: "Role-based access control with admin, manager, pharmacist, and cashier roles." },
  { icon: Printer, title: "Receipt Printing", desc: "58mm, 80mm, and A4 receipt printing with print preview." },
  { icon: Barcode, title: "Barcode Support", desc: "Fast barcode scanning for instant product lookup at the counter." },
  { icon: Keyboard, title: "Full Keyboard Control", desc: "Every module operable with keyboard shortcuts. Designed for pharmacy counter speed." },
];

const workflow = [
  { step: "F9", label: "Open Purchase" },
  { step: "Ctrl+P", label: "Search Product" },
  { step: "Enter", label: "Select Product" },
  { step: "Qty", label: "Enter Quantity" },
  { step: "Enter", label: "Add to List" },
  { step: "Ctrl+S", label: "Save Purchase" },
  { step: "Ctrl+Shift+P", label: "Print GRN" },
];

export default function Landing() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen"
    >
      {/* Hero */}
      <section className="border-b-4 border-border bg-accent/30">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-24 text-center">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="inline-flex items-center gap-2 mb-6">
              <div className="w-12 h-12 bg-primary text-primary-foreground border-4 border-border shadow-[4px_4px_0px_0px_#1A1A1A] flex items-center justify-center">
                <Pill className="size-7" />
              </div>
              <span className="text-2xl font-black tracking-tight">FREE BUFF</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-4xl sm:text-6xl font-black leading-tight"
          >
            Medical Pharmacy
            <br />
            <span className="bg-accent border-4 border-border px-4 py-1 inline-block mt-2 shadow-[4px_4px_0px_0px_#1A1A1A]">
              Management Software
            </span>
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            Professional pharmacy POS system designed for speed. Keyboard-first workflow that lets you
            complete purchases and sales without a mouse.
          </motion.p>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8 flex items-center justify-center gap-4 flex-wrap"
          >
            <Link to="/auth">
              <Button className="nb-btn text-base px-8 py-3">
                Get Started <ArrowRight className="ml-2 size-5" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="outline" className="nb-btn-outline text-base px-8 py-3">
                Live Demo
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Keyboard Workflow */}
      <section className="border-b-4 border-border py-12 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-black text-center mb-2">Fast Keyboard Workflow</h2>
          <p className="text-center text-muted-foreground text-sm mb-8">Complete a purchase in 7 keystrokes</p>
          <div className="flex flex-wrap justify-center gap-2">
            {workflow.map((w, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="nb-card-sm p-3 text-center min-w-[100px]">
                  <p className="nb-badge bg-accent font-mono text-sm mb-1">{w.step}</p>
                  <p className="text-xs font-bold">{w.label}</p>
                </div>
                {i < workflow.length - 1 && (
                  <span className="text-xl font-bold text-muted-foreground">→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-b-4 border-border py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-black text-center mb-8">Everything Your Pharmacy Needs</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 * i }}
              >
                <Card className="nb-card h-full">
                  <CardContent className="p-5">
                    <div className="w-10 h-10 bg-accent border-2 border-border flex items-center justify-center mb-3">
                      <f.icon className="size-5" />
                    </div>
                    <h3 className="font-bold text-sm mb-1">{f.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose */}
      <section className="border-b-4 border-border py-16 bg-accent/10">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-black text-center mb-8">Why Free Buff?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              "100% keyboard-operable",
              "Fast barcode scanning",
              "Real-time stock updates",
              "Batch & expiry tracking",
              "Professional receipts",
              "Role-based security",
              "Sales & purchase reports",
              "No internet required",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 nb-card-sm p-3">
                <div className="w-6 h-6 bg-green-500 text-white border-2 border-border flex items-center justify-center shrink-0">
                  <Check className="size-4" />
                </div>
                <span className="text-sm font-semibold">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-black mb-4">Ready to Upgrade Your Pharmacy?</h2>
          <p className="text-muted-foreground mb-8">Start managing your pharmacy like a professional.</p>
          <Link to="/auth">
            <Button className="nb-btn text-lg px-12 py-4">
              <Zap className="mr-2 size-5" /> Start Now — It's Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-4 border-border bg-muted py-8 text-center">
        <p className="text-xs text-muted-foreground font-bold">
          © 2026 Free Buff Pharmacy Management Software
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">
          Professional Medical Pharmacy POS System
        </p>
      </footer>
    </motion.div>
  );
}
