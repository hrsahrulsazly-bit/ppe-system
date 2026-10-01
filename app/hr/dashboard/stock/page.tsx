"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PpeItem } from "@/lib/types";
import { CATEGORY_RULES, LOW_STOCK_THRESHOLD, Kategori } from "@/lib/ppe-config";
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
  const [flatEdits, setFlatEdits] = useState<Record<string, number>>({});
  const [sizeEdits, setSizeEdits] = useState<Record<string, Record<string, number>>>({});
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

  async function saveFlatStock(id: string) {
    const value = flatEdits[id];
    if (value === undefined) return;
    setSavingId(id);
    await supabase
      .from("ppe_items")
      .update({ stock: value, updated_at: new Date().toISOString() })
      .eq("id", id);
    setSavingId(null);
    setFlatEdits((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    loadItems();
  }

  function sizeValueFor(item: PpeItem, size: string): number {
    const edited = sizeEdits[item.id]?.[size];
    if (edited !== undefined) return edited;
    return item.stock_by_size?.[size] ?? 0;
  }

  function updateSizeEdit(item: PpeItem, size: string, value: number) {
    setSizeEdits((prev) => ({
      ...prev,
      [item.id]: {
        ...(prev[item.id] ?? Object.fromEntries(
          (CATEGORY_RULES[item.category as Kategori].sizeOptions ?? []).map((s) => [
            s,
            item.stock_by_size?.[s] ?? 0,
          ])
        )),
        [size]: value,
      },
    }));
  }

  function hasSizeEdits(itemId: string): boolean {
    return sizeEdits[itemId] !== undefined;
  }

  async function saveSizeStock(item: PpeItem) {
    const sizeOptions = CATEGORY_RULES[item.category as Kategori].sizeOptions ?? [];
    const merged: Record<string, number> = {};
    for (const size of sizeOptions) {
      merged[size] = sizeValueFor(item, size);
    }
    setSavingId(item.id);
    await supabase
      .from("ppe_items")
      .update({ stock_by_size: merged, updated_at: new Date().toISOString() })
      .eq("id", item.id);
    setSavingId(null);
    setSizeEdits((prev) => {
      const next = { ...prev };
      delete next[item.id];
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

      {loading ? (
        <Card>
          <CardBody className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 className="animate-spin" size={24} />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const rule = CATEGORY_RULES[item.category as Kategori];
            const lowStock = item.stock <= LOW_STOCK_THRESHOLD;

            if (!rule.needsSize) {
              const editing = flatEdits[item.id] !== undefined;
              const value = editing ? flatEdits[item.id] : item.stock;
              return (
                <Card key={item.id}>
                  <CardHeader className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {item.category} {item.variant}
                      </p>
                      <p className="text-xs text-slate-400">{item.unit}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-slate-500">Stok Semasa:</label>
                      <input
                        type="number"
                        min={0}
                        value={value}
                        onChange={(e) =>
                          setFlatEdits((prev) => ({ ...prev, [item.id]: parseInt(e.target.value) || 0 }))
                        }
                        className={`w-24 rounded-md border px-2 py-1 ${
                          lowStock ? "border-red-300 text-red-700 font-semibold" : "border-slate-300"
                        }`}
                      />
                      {editing && (
                        <Button size="sm" onClick={() => saveFlatStock(item.id)} loading={savingId === item.id}>
                          <Save size={14} /> Simpan
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              );
            }

            const sizeOptions = rule.sizeOptions ?? [];
            const total = sizeOptions.reduce((sum, s) => sum + sizeValueFor(item, s), 0);
            const totalLow = total <= LOW_STOCK_THRESHOLD;

            return (
              <Card key={item.id}>
                <CardHeader className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800">
                      {item.category} {item.variant}
                    </p>
                    <p className="text-xs text-slate-400">{item.unit} · ikut saiz</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${totalLow ? "text-red-600" : "text-slate-600"}`}>
                      Jumlah: {total}
                    </span>
                    {hasSizeEdits(item.id) && (
                      <Button size="sm" onClick={() => saveSizeStock(item)} loading={savingId === item.id}>
                        <Save size={14} /> Simpan
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="flex flex-wrap gap-3">
                    {sizeOptions.map((size) => (
                      <div key={size} className="flex flex-col items-start gap-1">
                        <label className="text-xs font-medium text-slate-500">Saiz {size}</label>
                        <input
                          type="number"
                          min={0}
                          value={sizeValueFor(item, size)}
                          onChange={(e) => updateSizeEdit(item, size, parseInt(e.target.value) || 0)}
                          className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <ImportModal<StockRowData>
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Stok PPE"
        helpText="Padan ikut ID dahulu; jika ID kosong, sistem akan cuba padan ikut Peralatan + Varian. Nota: import hanya kemaskini stok item TANPA saiz (Safety Helmet) — untuk item bersaiz (Vest/Kasut/Uniform), guna input saiz di atas."
        onDownloadTemplate={() => downloadStockTemplate(items)}
        onParseFile={parseStockFile}
        onCommit={(rows, onProgress) => importStock(supabase, rows, items, onProgress)}
        onImported={loadItems}
        renderRowSummary={(d) => `${d.id ?? `${d.category}/${d.variant}`} → stok: ${d.stock}`}
      />
    </div>
  );
}
