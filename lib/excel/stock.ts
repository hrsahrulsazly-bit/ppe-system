import * as XLSX from "xlsx";
import { SupabaseClient } from "@supabase/supabase-js";
import { downloadWorkbook, readWorkbookRows, ParsedRow, ImportProgress } from "./shared";
import type { PpeItem } from "@/lib/types";

export const STOCK_HEADERS = [
  "ID (jangan tukar)",
  "Peralatan",
  "Varian",
  "Unit",
  "Stok Semasa",
];

export interface StockRowData {
  id: string | null;
  category: string;
  variant: string;
  unit: string;
  stock: number;
}

export function downloadStockTemplate(items: PpeItem[]) {
  const wb = XLSX.utils.book_new();
  const rows = items.length
    ? items.map((i) => [i.id, i.category, i.variant, i.unit, i.stock])
    : [["helmet-putih", "Safety Helmet", "Putih", "unit", 0]];
  const sheet = XLSX.utils.aoa_to_sheet([STOCK_HEADERS, ...rows]);
  XLSX.utils.book_append_sheet(wb, sheet, "Stok PPE");
  downloadWorkbook(wb, "Templat-Stok-PPE.xlsx");
}

export async function parseStockFile(file: File): Promise<ParsedRow<StockRowData>[]> {
  const rows = await readWorkbookRows(file);
  return rows.map((raw, idx) => {
    const errors: string[] = [];
    const id = raw["ID (jangan tukar)"]?.trim() || null;
    const category = raw["Peralatan"]?.trim();
    const variant = raw["Varian"]?.trim();
    const unit = raw["Unit"]?.trim() || "unit";
    const stockRaw = raw["Stok Semasa"]?.trim();

    if (!id && (!category || !variant)) {
      errors.push("Perlu ID ATAU (Peralatan + Varian) untuk padankan item");
    }
    const stock = Number(stockRaw);
    if (stockRaw === "" || Number.isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
      errors.push("Stok Semasa mesti nombor bulat ≥ 0");
    }

    const data: StockRowData | null =
      errors.length === 0 ? { id, category, variant, unit, stock } : null;

    return { rowNum: idx + 2, raw, data, errors };
  });
}

/** Padan ikut ID dahulu, jatuh balik ke padanan Kategori+Varian. */
function matchItem(row: StockRowData, items: PpeItem[]): PpeItem | undefined {
  if (row.id) {
    const byId = items.find((i) => i.id === row.id);
    if (byId) return byId;
  }
  return items.find(
    (i) =>
      i.category.toLowerCase() === row.category?.toLowerCase() &&
      i.variant.toLowerCase() === row.variant?.toLowerCase()
  );
}

export async function importStock(
  supabase: SupabaseClient,
  rows: StockRowData[],
  currentItems: PpeItem[],
  onProgress?: (p: ImportProgress) => void
): Promise<{ success: number; failed: number; failedRows: { row: StockRowData; message: string }[] }> {
  let success = 0;
  const failedRows: { row: StockRowData; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const match = matchItem(row, currentItems);
    if (!match) {
      failedRows.push({ row, message: "Item tidak dijumpai dalam sistem (ID/Kategori+Varian tidak sepadan)" });
    } else {
      const { error } = await supabase
        .from("ppe_items")
        .update({ stock: row.stock, unit: row.unit || match.unit, updated_at: new Date().toISOString() })
        .eq("id", match.id);
      if (error) {
        failedRows.push({ row, message: error.message });
      } else {
        success += 1;
      }
    }
    onProgress?.({ done: i + 1, total: rows.length });
  }

  return { success, failed: failedRows.length, failedRows };
}

export function exportStock(items: PpeItem[]) {
  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    STOCK_HEADERS,
    ...items.map((i) => [i.id, i.category, i.variant, i.unit, i.stock]),
  ]);
  XLSX.utils.book_append_sheet(wb, sheet, "Stok PPE");
  downloadWorkbook(wb, `Stok-PPE-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
