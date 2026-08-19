import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Keyboard } from "lucide-react";

const shortcutSections = [
  {
    title: "Global Navigation",
    shortcuts: [
      { key: "F1", action: "Help" },
      { key: "F2", action: "Products" },
      { key: "F6", action: "Customers" },
      { key: "F7", action: "Suppliers" },
      { key: "F8", action: "Inventory" },
      { key: "F9", action: "Purchase / GRN" },
      { key: "F10", action: "POS / Sales" },
      { key: "F12", action: "Dashboard" },
    ],
  },
  {
    title: "Product Search",
    shortcuts: [
      { key: "Ctrl + F", action: "Product Search" },
      { key: "Ctrl + B", action: "Barcode Search" },
      { key: "Ctrl + P", action: "Purchase Product Search (in Purchase)" },
    ],
  },
  {
    title: "Purchase / GRN Screen",
    shortcuts: [
      { key: "Ctrl + P", action: "Focus Product Search" },
      { key: "Enter", action: "Select highlighted product" },
      { key: "Quantity + Enter", action: "Add row, return to Search" },
      { key: "↑ / ↓ Arrow", action: "Navigate search results" },
      { key: "Ctrl + S", action: "Save Purchase" },
      { key: "Ctrl + H", action: "Hold Purchase" },
      { key: "Ctrl + Shift + P", action: "Print GRN" },
      { key: "Esc", action: "Close search / Cancel" },
    ],
  },
  {
    title: "POS / Sales Screen",
    shortcuts: [
      { key: "Ctrl + F", action: "Product Search" },
      { key: "Enter", action: "Select highlighted product" },
      { key: "Quantity + Enter", action: "Add product, return to Search" },
      { key: "Ctrl + S", action: "Open Payment / Save" },
      { key: "Ctrl + H", action: "Hold Invoice" },
      { key: "Ctrl + R", action: "Resume Held Invoice" },
      { key: "Ctrl + D", action: "Delete last item" },
      { key: "Ctrl + Shift + P", action: "Print Invoice" },
      { key: "Esc", action: "Close / Cancel" },
    ],
  },
  {
    title: "Table Navigation",
    shortcuts: [
      { key: "↑ / ↓ Arrow", action: "Move between rows" },
      { key: "Left / Right Arrow", action: "Move between columns" },
      { key: "Enter", action: "Edit / Select cell" },
      { key: "Delete", action: "Remove selected row" },
      { key: "Home", action: "First row" },
      { key: "End", action: "Last row" },
      { key: "Page Up / Page Down", action: "Navigate large tables" },
      { key: "Esc", action: "Cancel current edit" },
    ],
  },
  {
    title: "General",
    shortcuts: [
      { key: "Enter", action: "Next / Select" },
      { key: "Shift + Enter", action: "Previous" },
      { key: "Tab", action: "Next section / control" },
      { key: "Shift + Tab", action: "Previous section / control" },
      { key: "Esc", action: "Close / Cancel" },
      { key: "Ctrl + S", action: "Save" },
      { key: "Ctrl + D", action: "Delete" },
      { key: "Ctrl + Shift + P", action: "Print" },
    ],
  },
];

export default function Shortcuts() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Keyboard className="size-6" />
        Keyboard Shortcuts
      </h1>
      <p className="text-sm text-muted-foreground">
        All shortcuts are active globally. Inside specific modules (Purchase, POS), additional context shortcuts are available.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {shortcutSections.map((section) => (
          <Card key={section.title} className="nb-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider">
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="nb-table">
                <thead>
                  <tr>
                    <th className="w-40">Shortcut</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {section.shortcuts.map((s) => (
                    <tr key={s.key}>
                      <td>
                        <code className="nb-badge bg-muted text-[11px] font-mono whitespace-nowrap">
                          {s.key}
                        </code>
                      </td>
                      <td className="text-sm">{s.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
