import * as XLSX from "xlsx";

export function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}

export function sheetFromAOA(rows: (string | number)[][]) {
  return XLSX.utils.aoa_to_sheet(rows);
}

export async function readWorkbookRows(
  file: File
): Promise<Record<string, string>[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
  return rows.map((row) => {
    const normalized: Record<string, string> = {};
    for (const key of Object.keys(row)) {
      normalized[key.trim()] = String(row[key] ?? "").trim();
    }
    return normalized;
  });
}

export interface ParsedRow<T> {
  rowNum: number; // baris dalam fail Excel (bermula 2, selepas header)
  raw: Record<string, string>;
  data: T | null;
  errors: string[];
}

export interface ImportProgress {
  done: number;
  total: number;
}
