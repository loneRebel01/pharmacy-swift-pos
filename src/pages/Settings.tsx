import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Save, Upload, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Settings() {
  const [pharmacyName, setPharmacyName] = useState(() => localStorage.getItem("pharmacy_name") || "Free Buff Pharmacy");
  const [phone, setPhone] = useState(() => localStorage.getItem("pharmacy_phone") || "0300-1234567");
  const [address, setAddress] = useState(() => localStorage.getItem("pharmacy_address") || "Main Street, City");
  const [receiptWidth, setReceiptWidth] = useState(() => localStorage.getItem("receipt_width") || "80mm");
  const [appName, setAppName] = useState(() => localStorage.getItem("app_name") || "Free Buff Pharmacy");
  const [appLogo, setAppLogo] = useState(() => localStorage.getItem("app_logo") || "");

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast.error("Logo must be under 500KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAppLogo(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    localStorage.setItem("pharmacy_name", pharmacyName);
    localStorage.setItem("pharmacy_phone", phone);
    localStorage.setItem("pharmacy_address", address);
    localStorage.setItem("receipt_width", receiptWidth);
    localStorage.setItem("app_name", appName);
    localStorage.setItem("app_logo", appLogo);
    toast.success("Settings saved");
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <SettingsIcon className="size-6" /> Settings
      </h1>

      <Card className="nb-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold uppercase">Application Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs font-bold">Application Name</label>
            <Input
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="Free Buff Pharmacy"
              className="nb-input text-sm mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Shown in the top-left sidebar area</p>
          </div>
          <div>
            <label className="text-xs font-bold">Logo</label>
            <div className="flex items-center gap-3 mt-1">
              <div className="w-10 h-10 bg-accent border-2 border-border flex items-center justify-center font-bold text-sm shrink-0">
                {appLogo ? (
                  <img src={appLogo} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  "FB"
                )}
              </div>
              <div className="flex gap-2">
                <label className="nb-btn-outline text-xs cursor-pointer inline-flex items-center gap-1">
                  <Upload className="size-3" /> Upload Logo
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
                {appLogo && (
                  <button
                    onClick={() => setAppLogo("")}
                    className="nb-btn-outline text-xs inline-flex items-center gap-1 text-destructive"
                  >
                    <X className="size-3" /> Remove
                  </button>
                )}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Square image recommended. Max 500KB. If empty, shows initials.</p>
          </div>
        </CardContent>
      </Card>

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
