import * as XLSX from "xlsx";
import { SupabaseClient } from "@supabase/supabase-js";
import { downloadWorkbook, readWorkbookRows, ParsedRow, ImportProgress } from "./shared";
import { JAWATAN_OPTIONS } from "@/lib/ppe-config";

export const EMPLOYEE_HEADERS = [
  "No. Staf",
  "Comp Code",
  "Branch",
  "Nama",
  "No. IC/Passport",
  "Jawatan",
];

export interface EmployeeRowData {
  staff_id: string;
  comp_code: string | null;
  branch: string | null;
  name: string;
  ic_number: string | null;
  position: string;
}

export function downloadEmployeeTemplate() {
  const wb = XLSX.utils.book_new();
  const dataSheet = XLSX.utils.aoa_to_sheet([
    EMPLOYEE_HEADERS,
    ["S1001", "HQ", "Cawangan A", "Ali bin Ahmad", "900101015555", "PEKERJA AM"],
  ]);
  XLSX.utils.book_append_sheet(wb, dataSheet, "Pekerja");

  const guideSheet = XLSX.utils.aoa_to_sheet([
    ["Panduan Pengisian"],
    [""],
    ["Lajur Jawatan mesti salah satu nilai berikut (huruf besar, tepat):"],
    ...JAWATAN_OPTIONS.map((j) => [j]),
    [""],
    ["Nota:"],
    ["- No. Staf ialah pengenal unik. Jika No. Staf sudah wujud, baris akan mengemaskini rekod sedia ada."],
    ["- Jika No. Staf baharu, rekod baharu akan ditambah."],
  ]);
  XLSX.utils.book_append_sheet(wb, guideSheet, "Panduan");

  downloadWorkbook(wb, "Templat-Pekerja.xlsx");
}

export async function parseEmployeeFile(
  file: File
): Promise<ParsedRow<EmployeeRowData>[]> {
  const rows = await readWorkbookRows(file);
  return rows.map((raw, idx) => {
    const errors: string[] = [];
    const staff_id = raw["No. Staf"]?.trim();
    const name = raw["Nama"]?.trim();
    const position = raw["Jawatan"]?.trim().toUpperCase();

    if (!staff_id) errors.push("No. Staf kosong");
    if (!name) errors.push("Nama kosong");
    if (!position) {
      errors.push("Jawatan kosong");
    } else if (!JAWATAN_OPTIONS.includes(position as (typeof JAWATAN_OPTIONS)[number])) {
      errors.push(`Jawatan "${position}" tidak sah`);
    }

    const data: EmployeeRowData | null =
      errors.length === 0
        ? {
            staff_id,
            comp_code: raw["Comp Code"]?.trim() || null,
            branch: raw["Branch"]?.trim() || null,
            name,
            ic_number: raw["No. IC/Passport"]?.trim() || null,
            position,
          }
        : null;

    return { rowNum: idx + 2, raw, data, errors };
  });
}

export async function importEmployees(
  supabase: SupabaseClient,
  rows: EmployeeRowData[],
  onProgress?: (p: ImportProgress) => void
): Promise<{ success: number; failed: number; failedRows: { row: EmployeeRowData; message: string }[] }> {
  let success = 0;
  const failedRows: { row: EmployeeRowData; message: string }[] = [];

  const BATCH_SIZE = 25;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("employees").upsert(batch, {
      onConflict: "staff_id",
    });
    if (error) {
      for (const row of batch) failedRows.push({ row, message: error.message });
    } else {
      success += batch.length;
    }
    onProgress?.({ done: Math.min(i + BATCH_SIZE, rows.length), total: rows.length });
  }

  return { success, failed: failedRows.length, failedRows };
}

export function exportEmployees(employees: EmployeeRowData[]) {
  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    EMPLOYEE_HEADERS,
    ...employees.map((e) => [
      e.staff_id,
      e.comp_code ?? "",
      e.branch ?? "",
      e.name,
      e.ic_number ?? "",
      e.position,
    ]),
  ]);
  XLSX.utils.book_append_sheet(wb, sheet, "Pekerja");
  downloadWorkbook(wb, `Senarai-Pekerja-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
