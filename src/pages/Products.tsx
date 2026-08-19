import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  Download,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface ProductFormData {
  code: string;
  barcode: string;
  name: string;
  genericName: string;
  brand: string;
  manufacturer: string;
  category: string;
  subcategory: string;
  batchNumber: string;
  rackNumber: string;
  unit: string;
  purchasePrice: number;
  retailPrice: number;
  wholesalePrice: number;
  tax: number;
  discount: number;
  expiryDate: string;
  manufacturingDate: string;
  minimumStock: number;
  maximumStock: number;
  supplierId: string;
  notes: string;
  currentStock: number;
}

const emptyForm: ProductFormData = {
  code: "",
  barcode: "",
  name: "",
  genericName: "",
  brand: "",
  manufacturer: "",
  category: "",
  subcategory: "",
  batchNumber: "",
  rackNumber: "",
  unit: "strip",
  purchasePrice: 0,
  retailPrice: 0,
  wholesalePrice: 0,
  tax: 0,
  discount: 0,
  expiryDate: "",
  manufacturingDate: "",
  minimumStock: 10,
  maximumStock: 100,
  supplierId: "",
  notes: "",
  currentStock: 0,
};

export default function Products() {
  const products = useQuery(api.products.list);
  const searchProducts = useQuery(api.products.search, { searchTerm: "" });
  const createProduct = useMutation(api.products.create);
  const updateProduct = useMutation(api.products.update);
  const removeProduct = useMutation(api.products.remove);

  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<Id<"products"> | null>(null);
  const [form, setForm] = useState<ProductFormData>({...emptyForm});
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"products"> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = (products ?? []).filter((p) => {
    if (!searchTerm) return p.isActive;
    const term = searchTerm.toLowerCase();
    return (
      p.isActive &&
      (p.name.toLowerCase().includes(term) ||
        p.code.toLowerCase().includes(term) ||
        (p.barcode && p.barcode.toLowerCase().includes(term)) ||
        (p.genericName && p.genericName.toLowerCase().includes(term)) ||
        (p.brand && p.brand.toLowerCase().includes(term)) ||
        (p.batchNumber && p.batchNumber.toLowerCase().includes(term)))
    );
  });

  const resetForm = useCallback(() => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!form.code.trim()) {
      toast.error("Product code is required");
      return;
    }
    try {
      const data = {
        ...form,
        purchasePrice: Number(form.purchasePrice) || 0,
        retailPrice: Number(form.retailPrice) || 0,
        wholesalePrice: Number(form.wholesalePrice) || 0,
        tax: Number(form.tax) || 0,
        discount: Number(form.discount) || 0,
        minimumStock: Number(form.minimumStock) || 10,
        maximumStock: Number(form.maximumStock) || 100,
        currentStock: Number(form.currentStock) || 0,
        supplierId: (form.supplierId || undefined) as Id<"suppliers"> | undefined,
      };

      if (editingId) {
        await updateProduct({ id: editingId, ...data });
        toast.success("Product updated");
      } else {
        await createProduct(data);
        toast.success("Product created");
      }
      resetForm();
    } catch (e) {
      toast.error(String(e));
    }
  }, [form, editingId, createProduct, updateProduct, resetForm]);

  const handleEdit = useCallback((product: (typeof products extends (infer T)[] | undefined ? T : never)) => {
    setForm({
      code: product.code,
      barcode: product.barcode ?? "",
      name: product.name,
      genericName: product.genericName ?? "",
      brand: product.brand ?? "",
      manufacturer: product.manufacturer ?? "",
      category: product.category ?? "",
      subcategory: product.subcategory ?? "",
      batchNumber: product.batchNumber ?? "",
      rackNumber: product.rackNumber ?? "",
      unit: product.unit,
      purchasePrice: product.purchasePrice,
      retailPrice: product.retailPrice,
      wholesalePrice: product.wholesalePrice ?? 0,
      tax: product.tax ?? 0,
      discount: product.discount ?? 0,
      expiryDate: product.expiryDate ?? "",
      manufacturingDate: product.manufacturingDate ?? "",
      minimumStock: product.minimumStock ?? 10,
      maximumStock: product.maximumStock ?? 100,
      supplierId: product.supplierId ?? "",
      notes: product.notes ?? "",
      currentStock: product.currentStock,
    });
    setEditingId(product._id);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(async (id: Id<"products">) => {
    await removeProduct({ id });
    setDeleteConfirm(null);
    toast.success("Product deleted");
  }, [removeProduct]);

  const exportCSV = useCallback(() => {
    const headers = ["Code", "Name", "Generic", "Brand", "Category", "Stock", "Purchase Price", "Retail Price"];
    const rows = filtered.map((p) => [
      p.code, p.name, p.genericName ?? "", p.brand ?? "", p.category ?? "",
      String(p.currentStock), String(p.purchasePrice), String(p.retailPrice),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Products exported");
  }, [filtered]);

  const generateCode = useCallback(() => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "PRD-";
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setForm((prev) => ({ ...prev, code }));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="size-6" />
          Products
        </h1>
        <div className="flex gap-2">
          <Button onClick={exportCSV} variant="outline" className="nb-btn-outline text-xs">
            <Download className="size-3 mr-1" />
            Export CSV
          </Button>
          <Button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="nb-btn text-xs"
          >
            <Plus className="size-3 mr-1" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card className="nb-card-sm">
        <CardContent className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search by name, code, barcode, generic, brand, batch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="nb-input w-full pl-10 text-sm"
              autoFocus
            />
          </div>
        </CardContent>
      </Card>

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-auto pt-10 pb-10" onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}>
          <Card className="nb-card w-full max-w-2xl mx-4">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold uppercase">
                {editingId ? "Edit Product" : "Add New Product"}
              </CardTitle>
              <button onClick={resetForm} className="p-1 hover:bg-muted border-2 border-transparent hover:border-border">
                <X className="size-4" />
              </button>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[70vh] overflow-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold">Product Code *</label>
                  <div className="flex gap-1 mt-1">
                    <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="nb-input text-sm" />
                    <Button onClick={generateCode} variant="outline" className="nb-btn-outline text-xs shrink-0" type="button">Generate</Button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold">Barcode</label>
                  <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="nb-input text-sm mt-1" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold">Product Name *</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="nb-input text-sm mt-1" autoFocus />
                </div>
                <div>
                  <label className="text-xs font-bold">Generic Name</label>
                  <Input value={form.genericName} onChange={(e) => setForm({ ...form, genericName: e.target.value })} className="nb-input text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold">Brand</label>
                  <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="nb-input text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold">Manufacturer</label>
                  <Input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} className="nb-input text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold">Category</label>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="nb-input text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold">Subcategory</label>
                  <Input value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} className="nb-input text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold">Batch Number</label>
                  <Input value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} className="nb-input text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold">Rack Number</label>
                  <Input value={form.rackNumber} onChange={(e) => setForm({ ...form, rackNumber: e.target.value })} className="nb-input text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold">Unit</label>
                  <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="nb-input text-sm mt-1 w-full">
                    <option value="strip">Strip</option>
                    <option value="tablet">Tablet</option>
                    <option value="capsule">Capsule</option>
                    <option value="bottle">Bottle</option>
                    <option value="tube">Tube</option>
                    <option value="sachet">Sachet</option>
                    <option value="box">Box</option>
                    <option value="vial">Vial</option>
                    <option value="piece">Piece</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold">Current Stock *</label>
                  <Input type="number" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: Number(e.target.value) })} className="nb-input text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold">Purchase Price *</label>
                  <Input type="number" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })} className="nb-input text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold">Retail Price *</label>
                  <Input type="number" value={form.retailPrice} onChange={(e) => setForm({ ...form, retailPrice: Number(e.target.value) })} className="nb-input text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold">Wholesale Price</label>
                  <Input type="number" value={form.wholesalePrice} onChange={(e) => setForm({ ...form, wholesalePrice: Number(e.target.value) })} className="nb-input text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold">Tax %</label>
                  <Input type="number" value={form.tax} onChange={(e) => setForm({ ...form, tax: Number(e.target.value) })} className="nb-input text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold">Discount %</label>
                  <Input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })} className="nb-input text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold">Expiry Date</label>
                  <Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className="nb-input text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold">Manufacturing Date</label>
                  <Input type="date" value={form.manufacturingDate} onChange={(e) => setForm({ ...form, manufacturingDate: e.target.value })} className="nb-input text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold">Minimum Stock</label>
                  <Input type="number" value={form.minimumStock} onChange={(e) => setForm({ ...form, minimumStock: Number(e.target.value) })} className="nb-input text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold">Maximum Stock</label>
                  <Input type="number" value={form.maximumStock} onChange={(e) => setForm({ ...form, maximumStock: Number(e.target.value) })} className="nb-input text-sm mt-1" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold">Notes</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="nb-input text-sm mt-1 w-full h-16 resize-none" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} className="nb-btn text-xs flex-1">
                  {editingId ? "Update Product" : "Save Product"}
                </Button>
                <Button onClick={resetForm} variant="outline" className="nb-btn-outline text-xs">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}>
          <Card className="nb-card w-full max-w-sm mx-4">
            <CardContent className="p-6 text-center">
              <Trash2 className="size-8 mx-auto mb-3 text-destructive" />
              <p className="font-bold mb-1">Delete Product?</p>
              <p className="text-sm text-muted-foreground mb-4">This action cannot be undone.</p>
              <div className="flex gap-2">
                <Button onClick={() => handleDelete(deleteConfirm)} className="nb-btn-destructive text-xs flex-1">
                  Delete
                </Button>
                <Button onClick={() => setDeleteConfirm(null)} variant="outline" className="nb-btn-outline text-xs flex-1">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Products Table */}
      <Card className="nb-card">
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[calc(100vh-300px)]">
            <table className="nb-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Generic</th>
                  <th>Brand</th>
                  <th>Category</th>
                  <th>Batch</th>
                  <th className="text-right">Stock</th>
                  <th className="text-right">Purchase</th>
                  <th className="text-right">Retail</th>
                  <th>Expiry</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? "No products match your search" : "No products found. Add your first product!"}
                    </td>
                  </tr>
                ) : (
                  filtered.map((product) => {
                    const isExpired = product.expiryDate && product.expiryDate <= new Date().toISOString().split("T")[0];
                    const isLowStock = product.minimumStock !== undefined && product.currentStock <= product.minimumStock;
                    return (
                      <tr key={product._id} className={isExpired ? "bg-red-50" : isLowStock ? "bg-yellow-50" : ""}>
                        <td className="font-mono text-xs">{product.code}</td>
                        <td className="font-semibold text-sm">{product.name}</td>
                        <td className="text-sm text-muted-foreground">{product.genericName ?? "-"}</td>
                        <td className="text-sm">{product.brand ?? "-"}</td>
                        <td className="text-sm">{product.category ?? "-"}</td>
                        <td className="text-xs font-mono">{product.batchNumber ?? "-"}</td>
                        <td className={`text-right font-bold ${isLowStock ? "text-destructive" : ""}`}>
                          {product.currentStock}
                        </td>
                        <td className="text-right text-sm">PKR {product.purchasePrice.toLocaleString()}</td>
                        <td className="text-right text-sm">PKR {product.retailPrice.toLocaleString()}</td>
                        <td className={`text-xs ${isExpired ? "text-destructive font-bold" : ""}`}>
                          {product.expiryDate ?? "-"}
                        </td>
                        <td>
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() => handleEdit(product)}
                              className="p-1 hover:bg-muted border-2 border-transparent hover:border-border transition-all"
                              title="Edit"
                            >
                              <Edit2 className="size-3" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(product._id)}
                              className="p-1 hover:bg-destructive/10 border-2 border-transparent hover:border-border transition-all"
                              title="Delete"
                            >
                              <Trash2 className="size-3 text-destructive" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
