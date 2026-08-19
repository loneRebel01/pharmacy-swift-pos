import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Plus, Search, Edit2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const emptyForm = { name: "", companyName: "", phone: "", address: "", ntn: "", email: "", previousBalance: 0, notes: "" };

export default function Suppliers() {
  const suppliers = useQuery(api.suppliers.list);
  const createSupplier = useMutation(api.suppliers.create);
  const updateSupplier = useMutation(api.suppliers.update);
  const removeSupplier = useMutation(api.suppliers.remove);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<Id<"suppliers"> | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"suppliers"> | null>(null);

  const filtered = (suppliers ?? []).filter((s) => {
    if (!searchTerm) return s.isActive;
    const t = searchTerm.toLowerCase();
    return s.isActive && (s.name.toLowerCase().includes(t) || (s.companyName && s.companyName.toLowerCase().includes(t)) || (s.phone && s.phone.includes(t)));
  });

  const resetForm = useCallback(() => { setForm(emptyForm); setEditingId(null); setShowForm(false); }, []);

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    try {
      if (editingId) {
        await updateSupplier({ id: editingId, ...form });
        toast.success("Supplier updated");
      } else {
        await createSupplier({ ...form, previousBalance: form.previousBalance || undefined });
        toast.success("Supplier created");
      }
      resetForm();
    } catch (e) { toast.error(String(e)); }
  }, [form, editingId, createSupplier, updateSupplier, resetForm]);

  const handleEdit = useCallback((s: typeof filtered[0]) => {
    setForm({ name: s.name, companyName: s.companyName ?? "", phone: s.phone ?? "", address: s.address ?? "", ntn: s.ntn ?? "", email: s.email ?? "", previousBalance: s.previousBalance ?? 0, notes: s.notes ?? "" });
    setEditingId(s._id); setShowForm(true);
  }, []);

  const handleDelete = useCallback(async (id: Id<"suppliers">) => {
    await removeSupplier({ id }); setDeleteConfirm(null); toast.success("Supplier deleted");
  }, [removeSupplier]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="size-6" /> Suppliers</h1>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="nb-btn text-xs">
          <Plus className="size-3 mr-1" /> Add Supplier
        </Button>
      </div>

      <Card className="nb-card-sm"><CardContent className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input type="text" placeholder="Search suppliers..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="nb-input w-full pl-10 text-sm" autoFocus />
        </div>
      </CardContent></Card>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}>
          <Card className="nb-card w-full max-w-md mx-4">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold uppercase">{editingId ? "Edit" : "Add"} Supplier</CardTitle>
              <button onClick={resetForm} className="p-1 hover:bg-muted"><X className="size-4" /></button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div><label className="text-xs font-bold">Name *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="nb-input text-sm mt-1" autoFocus /></div>
              <div><label className="text-xs font-bold">Company Name</label><Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className="nb-input text-sm mt-1" /></div>
              <div><label className="text-xs font-bold">Phone</label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="nb-input text-sm mt-1" /></div>
              <div><label className="text-xs font-bold">Address</label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="nb-input text-sm mt-1" /></div>
              <div><label className="text-xs font-bold">NTN</label><Input value={form.ntn} onChange={(e) => setForm({ ...form, ntn: e.target.value })} className="nb-input text-sm mt-1" /></div>
              <div><label className="text-xs font-bold">Email</label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="nb-input text-sm mt-1" /></div>
              <div><label className="text-xs font-bold">Previous Balance</label><Input type="number" value={form.previousBalance} onChange={(e) => setForm({ ...form, previousBalance: Number(e.target.value) })} className="nb-input text-sm mt-1" /></div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} className="nb-btn text-xs flex-1">{editingId ? "Update" : "Save"}</Button>
                <Button onClick={resetForm} variant="outline" className="nb-btn-outline text-xs">Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}>
          <Card className="nb-card w-full max-w-sm mx-4"><CardContent className="p-6 text-center">
            <Trash2 className="size-8 mx-auto mb-3 text-destructive" />
            <p className="font-bold mb-1">Delete Supplier?</p>
            <p className="text-sm text-muted-foreground mb-4">This cannot be undone.</p>
            <div className="flex gap-2">
              <Button onClick={() => handleDelete(deleteConfirm)} className="nb-btn-destructive text-xs flex-1">Delete</Button>
              <Button onClick={() => setDeleteConfirm(null)} variant="outline" className="nb-btn-outline text-xs flex-1">Cancel</Button>
            </div>
          </CardContent></Card>
        </div>
      )}

      <Card className="nb-card"><CardContent className="p-0">
        <div className="overflow-auto max-h-[calc(100vh-300px)]">
          <table className="nb-table">
            <thead><tr><th>Name</th><th>Company</th><th>Phone</th><th>Address</th><th>NTN</th><th className="text-right">Balance</th><th className="text-center">Actions</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No suppliers found</td></tr>
              ) : filtered.map((s) => (
                <tr key={s._id}>
                  <td className="font-semibold text-sm">{s.name}</td>
                  <td className="text-sm">{s.companyName ?? "-"}</td>
                  <td className="text-sm">{s.phone ?? "-"}</td>
                  <td className="text-sm">{s.address ?? "-"}</td>
                  <td className="text-sm">{s.ntn ?? "-"}</td>
                  <td className={`text-right text-sm font-bold ${s.currentBalance > 0 ? "text-destructive" : ""}`}>PKR {s.currentBalance.toLocaleString()}</td>
                  <td><div className="flex justify-center gap-1">
                    <button onClick={() => handleEdit(s)} className="p-1 hover:bg-muted border-2 border-transparent hover:border-border"><Edit2 className="size-3" /></button>
                    <button onClick={() => setDeleteConfirm(s._id)} className="p-1 hover:bg-destructive/10 border-2 border-transparent hover:border-border"><Trash2 className="size-3 text-destructive" /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent></Card>
    </div>
  );
}
