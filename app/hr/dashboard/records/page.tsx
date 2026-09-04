"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Employee, PpeItem, PpeRequest, RequestStatus } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import RequestModal from "@/components/hr/RequestModal";
import ImportModal from "@/components/hr/ImportModal";
import {
  downloadRecordTemplate,
  parseRecordFile,
  importRecords,
  RecordLineData,
} from "@/lib/excel/records";
import { Search, Upload, Loader2 } from "lucide-react";

const STATUS_FILTERS: { value: "all" | RequestStatus; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "pending", label: "Menunggu" },
  { value: "issued", label: "Dikeluarkan" },
  { value: "rejected", label: "Ditolak" },
];

export default function RecordsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [requests, setRequests] = useState<PpeRequest[]>([]);
  const [ppeItems, setPpeItems] = useState<PpeItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | RequestStatus>("all");
  const [selected, setSelected] = useState<PpeRequest | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [reqRes, itemsRes, empRes] = await Promise.all([
      supabase.from("requests").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("ppe_items").select("*"),
      supabase.from("employees").select("*"),
    ]);
    setRequests((reqRes.data as PpeRequest[]) ?? []);
    setPpeItems((itemsRes.data as PpeItem[]) ?? []);
    setEmployees((empRes.data as Employee[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    loadData();
  }, [loadData]);

  const filtered = requests.filter((r) => {
    if (status !== "all" && r.status !== status) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return r.employee_name.toLowerCase().includes(q) || r.staff_id.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Rekod Permohonan</h1>
        <Button onClick={() => setImportOpen(true)}>
          <Upload size={16} /> Import Data Lama
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau No. Staf..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatus(f.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  status === f.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="animate-spin" size={24} />
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">Tiada rekod dijumpai.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((req) => (
                <button
                  key={req.id}
                  onClick={() => setSelected(req)}
                  className="flex w-full flex-col gap-1 px-5 py-4 text-left hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-800">{req.employee_name}</p>
                    <p className="text-xs text-slate-500">
                      No. Staf: {req.staff_id} · {req.items.length} item ·{" "}
                      {new Date(req.created_at).toLocaleDateString("ms-MY")}
                      {req.ref_no ? ` · ${req.ref_no}` : ""}
                    </p>
                  </div>
                  <Badge status={req.status} />
                </button>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <RequestModal
        open={!!selected}
        onClose={() => setSelected(null)}
        request={selected}
        ppeItems={ppeItems}
        hrEmail=""
        onProcessed={loadData}
        readOnly
      />

      <ImportModal<RecordLineData>
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Data Lama"
        helpText="Baris dengan No. Rujukan yang sama akan digabung jadi SATU rekod (pelbagai item). Baris tanpa No. Rujukan jadi rekod berasingan. Rekod diimport terus ditanda 'Dikeluarkan' dan TIDAK menolak stok semasa."
        onDownloadTemplate={downloadRecordTemplate}
        onParseFile={(file) => parseRecordFile(file, employees)}
        onCommit={(rows, onProgress) => importRecords(supabase, rows, onProgress)}
        onImported={loadData}
        renderRowSummary={(d) =>
          `${d.staff_id} — ${d.itemName}${d.size ? ` (${d.size})` : ""} x${d.qty}${d.ref_no ? ` [${d.ref_no}]` : ""}`
        }
      />
    </div>
  );
}
