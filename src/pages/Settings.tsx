import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Settings() {
  const [pharmacyName, setPharmacyName] = useState("Free Buff Pharmacy");
  const [phone, setPhone] = useState("0300-1234567");
  const [address, setAddress] = useState("Main Street, City");
  const [receiptWidth, setReceiptWidth] = useState("80mm");

  const handleSave = () => {
    localStorage.setItem("pharmacy_name", pharmacyName);
    localStorage.setItem("pharmacy_phone", phone);
    localStorage.setItem("pharmacy_address", address);
    localStorage.setItem("receipt_width", receiptWidth);
    toast.success("Settings saved");
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <SettingsIcon className="size-6" /> Settings
      </h1>

      <Card className="nb-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold uppercase">Pharmacy Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div><label className="text-xs font-bold">Pharmacy Name</label><Input value={pharmacyName} onChange={(e) => setPharmacyName(e.target.value)} className="nb-input text-sm mt-1" /></div>
          <div><label className="text-xs font-bold">Phone</label><Input value={phone} onChange={(e) => setPhone(e.target.value)} className="nb-input text-sm mt-1" /></div>
          <div><label className="text-xs font-bold">Address</label><Input value={address} onChange={(e) => setAddress(e.target.value)} className="nb-input text-sm mt-1" /></div>
          <div>
            <label className="text-xs font-bold">Receipt Width</label>
            <select value={receiptWidth} onChange={(e) => setReceiptWidth(e.target.value)} className="nb-input text-sm mt-1 w-full">
              <option value="58mm">58mm Thermal</option>
              <option value="80mm">80mm Thermal</option>
              <option value="A4">A4 Paper</option>
            </select>
          </div>
          <Button onClick={handleSave} className="nb-btn text-xs mt-2">
            <Save className="size-3 mr-1" /> Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
