"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PpeItem } from "@/lib/types";
import { LOW_STOCK_THRESHOLD } from "@/lib/ppe-config";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ImportModal from "@/components/hr/ImportModal";
import {
  downloadStockTemplate,
  parseStockFile,
  importStock,
  exportStock,
  StockRowData,
} from "@/lib/excel/stock";
import { Download, Upload, Loader2, Save } from "lucide-react";

export default function StockPage() {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<PpeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("ppe_items").select("*").order("category").order("variant");
    setItems((data as PpeItem[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    loadItems();
  }, [loadItems]);

  async function saveStock(id: string) {
    const value = edits[id];
    if (value === undefined) return;
    setSavingId(id);
    await supabase
      .from("ppe_items")
      .update({ stock: value, updated_at: new Date().toISOString() })
      .eq("id", id);
    setSavingId(null);
    setEdits((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    loadItems();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Stok PPE</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportStock(items)}>
            <Download size={16} /> Eksport
          </Button>
          <Button onClick={() => setImportOpen(true)}>
            <Upload size={16} /> Import Excel
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-700">Senarai Item PPE</h2>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="animate-spin" size={24} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Peralatan</th>
                    <th className="px-5 py-3">Varian</th>
                    <th className="px-5 py-3">Unit</th>
                    <th className="px-5 py-3">Stok Semasa</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => {
                    const editing = edits[item.id] !== undefined;
                    const value = editing ? edits[item.id] : item.stock;
                    return (
                      <tr key={item.id} className={item.stock <= LOW_STOCK_THRESHOLD ? "bg-red-50/40" : ""}>
                        <td className="px-5 py-3 font-medium text-slate-800">{item.category}</td>
                        <td className="px-5 py-3">{item.variant}</td>
                        <td className="px-5 py-3 text-slate-500">{item.unit}</td>
                        <td className="px-5 py-3">
                          <input
                            type="number"
                            min={0}
                            value={value}
                            onChange={(e) =>
                              setEdits((prev) => ({ ...prev, [item.id]: parseInt(e.target.value) || 0 }))
                            }
                            className={`w-24 rounded-md border px-2 py-1 ${
                              item.stock <= LOW_STOCK_THRESHOLD
                                ? "border-red-300 text-red-700 font-semibold"
                                : "border-slate-300"
                            }`}
                          />
                        </td>
                        <td className="px-5 py-3">
                          {editing && (
                            <Button
                              size="sm"
                              onClick={() => saveStock(item.id)}
                              loading={savingId === item.id}
                            >
                              <Save size={14} /> Simpan
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <ImportModal<StockRowData>
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Stok PPE"
        helpText="Padan ikut ID dahulu; jika ID kosong, sistem akan cuba padan ikut Peralatan + Varian."
        onDownloadTemplate={() => downloadStockTemplate(items)}
        onParseFile={parseStockFile}
        onCommit={(rows, onProgress) => importStock(supabase, rows, items, onProgress)}
        onImported={loadItems}
        renderRowSummary={(d) => `${d.id ?? `${d.category}/${d.variant}`} → stok: ${d.stock}`}
      />
    </div>
  );
}
