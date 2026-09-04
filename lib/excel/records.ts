import * as XLSX from "xlsx";
import { SupabaseClient } from "@supabase/supabase-js";
import { downloadWorkbook, readWorkbookRows, ParsedRow, ImportProgress } from "./shared";
import type { Employee } from "@/lib/types";

export const RECORD_HEADERS = [
  "No. Rujukan (Pilihan)",
  "Tarikh (DD/MM/YYYY)",
  "No. Staf",
  "Item",
  "Saiz",
  "Kuantiti",
  "Catatan",
];

export interface RecordLineData {
  ref_no: string; // "" jika tiada — setiap baris begini jadi rekod berasingan
  dateISO: string;
  staff_id: string;
  employee: Employee;
  itemName: string;
  size: string | null;
  qty: number;
  note: string;
}

export function downloadRecordTemplate() {
  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    RECORD_HEADERS,
    ["", "15/01/2025", "S1001", "Safety Helmet Kuning", "", 1, ""],
    ["RUJ-001", "20/03/2025", "S1002", "Safety Vest Staff", "L", 1, "Set pertama"],
    ["RUJ-001", "20/03/2025", "S1002", "Safety Shoes Black Hammer", "9", 1, ""],
  ]);
  XLSX.utils.book_append_sheet(wb, sheet, "Rekod Lama");
  downloadWorkbook(wb, "Templat-Rekod-Lama.xlsx");
}

function parseDateDMY(input: string): string | null {
  const m = input.trim().match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const day = parseInt(d, 10);
  const month = parseInt(mo, 10);
  const year = parseInt(y, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return date.toISOString();
}

export async function parseRecordFile(
  file: File,
  employees: Employee[]
): Promise<ParsedRow<RecordLineData>[]> {
  const rows = await readWorkbookRows(file);
  const byStaffId = new Map(employees.map((e) => [e.staff_id.trim(), e]));

  return rows.map((raw, idx) => {
    const errors: string[] = [];
    const ref_no = raw["No. Rujukan (Pilihan)"]?.trim() || "";
    const dateStr = raw["Tarikh (DD/MM/YYYY)"]?.trim();
    const staff_id = raw["No. Staf"]?.trim();
    const itemName = raw["Item"]?.trim();
    const size = raw["Saiz"]?.trim() || null;
    const qtyRaw = raw["Kuantiti"]?.trim();
    const note = raw["Catatan"]?.trim() || "";

    const dateISO = dateStr ? parseDateDMY(dateStr) : null;
    if (!dateStr) errors.push("Tarikh kosong");
    else if (!dateISO) errors.push("Format tarikh tidak sah (guna DD/MM/YYYY)");

    if (!staff_id) errors.push("No. Staf kosong");
    const employee = staff_id ? byStaffId.get(staff_id) : undefined;
    if (staff_id && !employee) errors.push(`No. Staf "${staff_id}" tidak dijumpai dalam pangkalan data pekerja`);

    if (!itemName) errors.push("Item kosong");

    const qty = Number(qtyRaw);
    if (!qtyRaw || Number.isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
      errors.push("Kuantiti mesti nombor bulat > 0");
    }

    const data: RecordLineData | null =
      errors.length === 0 && employee && dateISO
        ? { ref_no, dateISO, staff_id, employee, itemName, size, qty, note }
        : null;

    return { rowNum: idx + 2, raw, data, errors };
  });
}

interface GroupedRequestInput {
  ref_no: string | null;
  dateISO: string;
  employee: Employee;
  items: { itemId: string; name: string; size: string | null; qtyRequested: number; qtyIssued: number }[];
  note: string;
}

/** Baris dgn No. Rujukan sama digabung jadi SATU rekod; baris tanpa No. Rujukan jadi rekod berasingan. */
export function groupRecordLines(lines: RecordLineData[]): GroupedRequestInput[] {
  const groups: GroupedRequestInput[] = [];
  const refMap = new Map<string, GroupedRequestInput>();

  for (const line of lines) {
    const item = {
      itemId: line.itemName.toLowerCase().replace(/\s+/g, "-"),
      name: line.itemName,
      size: line.size,
      qtyRequested: line.qty,
      qtyIssued: line.qty,
    };

    if (line.ref_no) {
      const existing = refMap.get(line.ref_no);
      if (existing) {
        existing.items.push(item);
        if (line.note && !existing.note.includes(line.note)) {
          existing.note = existing.note ? `${existing.note}; ${line.note}` : line.note;
        }
      } else {
        const grouped: GroupedRequestInput = {
          ref_no: line.ref_no,
          dateISO: line.dateISO,
          employee: line.employee,
          items: [item],
          note: line.note,
        };
        refMap.set(line.ref_no, grouped);
        groups.push(grouped);
      }
    } else {
      groups.push({
        ref_no: null,
        dateISO: line.dateISO,
        employee: line.employee,
        items: [item],
        note: line.note,
      });
    }
  }

  return groups;
}

export async function importRecords(
  supabase: SupabaseClient,
  lines: RecordLineData[],
  onProgress?: (p: ImportProgress) => void
): Promise<{ success: number; failed: number; failedRows: { group: GroupedRequestInput; message: string }[] }> {
  const groups = groupRecordLines(lines);
  let success = 0;
  const failedRows: { group: GroupedRequestInput; message: string }[] = [];

  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    const { error } = await supabase.from("requests").insert({
      ref_no: g.ref_no,
      employee_id: g.employee.id,
      employee_name: g.employee.name,
      staff_id: g.employee.staff_id,
      comp_code: g.employee.comp_code,
      branch: g.employee.branch,
      ic_number: g.employee.ic_number,
      position: g.employee.position,
      items: g.items,
      note: "",
      status: "issued",
      remark: g.note,
      created_at: g.dateISO,
      processed_at: g.dateISO,
      processed_by: "Import Data Lama",
    });
    if (error) {
      failedRows.push({ group: g, message: error.message });
    } else {
      success += 1;
    }
    onProgress?.({ done: i + 1, total: groups.length });
  }

  return { success, failed: failedRows.length, failedRows };
}
