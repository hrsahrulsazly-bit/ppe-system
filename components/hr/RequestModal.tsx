"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/client";
import type { PpeItem, PpeRequest, RequestItem } from "@/lib/types";
import { downloadHandoverPdf } from "@/lib/pdf/downloadForRequest";
import { AlertTriangle, FileDown } from "lucide-react";

export default function RequestModal({
  open,
  onClose,
  request,
  ppeItems,
  hrEmail,
  onProcessed,
  readOnly,
}: {
  open: boolean;
  onClose: () => void;
  request: PpeRequest | null;
  ppeItems: PpeItem[];
  hrEmail: string;
  onProcessed: () => void;
  readOnly?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<RequestItem[]>([]);
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    if (request) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync local edit state to the opened request
      setItems(request.items.map((i) => ({ ...i })));
      setRemark(request.remark || "");
      setError(null);
    }
  }, [request]);

  if (!request) return null;

  const stockById = new Map(ppeItems.map((i) => [i.id, i.stock]));

  function updateQtyIssued(itemId: string, qty: number) {
    setItems((prev) =>
      prev.map((i) => (i.itemId === itemId ? { ...i, qtyIssued: Math.max(0, qty) } : i))
    );
  }

  async function handleApprove() {
    setSubmitting("approve");
    setError(null);
    const { error: rpcError } = await supabase.rpc("approve_request", {
      p_request_id: request!.id,
      p_items: items,
      p_remark: remark,
      p_processed_by: hrEmail,
    });
    setSubmitting(null);
    if (rpcError) {
      setError(rpcError.message || "Gagal meluluskan permohonan.");
      return;
    }
    onProcessed();
    onClose();
  }

  async function handleReject() {
    setSubmitting("reject");
    setError(null);
    const { error: rpcError } = await supabase.rpc("reject_request", {
      p_request_id: request!.id,
      p_remark: remark,
      p_processed_by: hrEmail,
    });
    setSubmitting(null);
    if (rpcError) {
      setError(rpcError.message || "Gagal menolak permohonan.");
      return;
    }
    onProcessed();
    onClose();
  }

  async function handleDownloadPdf() {
    setDownloadingPdf(true);
    try {
      await downloadHandoverPdf(supabase, request!);
    } finally {
      setDownloadingPdf(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Butiran Permohonan" wide>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-lg font-semibold text-slate-900">{request.employee_name}</p>
          <p className="text-sm text-slate-500">
            No. Staf: {request.staff_id} {request.branch ? `· ${request.branch}` : ""} ·{" "}
            {request.position}
          </p>
          {request.ref_no && (
            <p className="text-xs text-slate-400">No. Rujukan: {request.ref_no}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge status={request.status} />
          {request.status === "issued" && (
            <Button size="sm" variant="outline" onClick={handleDownloadPdf} loading={downloadingPdf}>
              <FileDown size={14} /> Muat Turun PDF
            </Button>
          )}
        </div>
      </div>

      {request.note && (
        <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          <span className="font-medium">Catatan Pekerja: </span>
          {request.note}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Saiz</th>
              <th className="px-3 py-2">Diminta</th>
              <th className="px-3 py-2">Stok Semasa</th>
              <th className="px-3 py-2">Nak Keluar</th>
              <th className="px-3 py-2">Baki Selepas Lulus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => {
              const stock = stockById.get(item.itemId) ?? 0;
              const baki = stock - item.qtyIssued;
              return (
                <tr key={item.itemId}>
                  <td className="px-3 py-2 font-medium text-slate-800">{item.name}</td>
                  <td className="px-3 py-2">{item.size ?? "-"}</td>
                  <td className="px-3 py-2">{item.qtyRequested}</td>
                  <td className="px-3 py-2">{stock}</td>
                  <td className="px-3 py-2">
                    {readOnly || request.status !== "pending" ? (
                      item.qtyIssued
                    ) : (
                      <input
                        type="number"
                        min={0}
                        value={item.qtyIssued}
                        onChange={(e) => updateQtyIssued(item.itemId, parseInt(e.target.value) || 0)}
                        className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm"
                      />
                    )}
                  </td>
                  <td
                    className={`px-3 py-2 font-semibold ${
                      baki < 0 ? "text-red-600" : "text-slate-700"
                    }`}
                  >
                    {baki < 0 && <AlertTriangle className="mr-1 inline" size={14} />}
                    {baki}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-sm font-semibold text-slate-700">Catatan HR</label>
        <textarea
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          rows={2}
          disabled={readOnly || request.status !== "pending"}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50"
        />
      </div>

      {request.status !== "pending" && (
        <p className="mt-3 text-sm text-slate-500">
          Diproses oleh <span className="font-medium">{request.processed_by}</span> pada{" "}
          {request.processed_at ? new Date(request.processed_at).toLocaleDateString("ms-MY") : "-"}
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {!readOnly && request.status === "pending" && (
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="danger" onClick={handleReject} loading={submitting === "reject"}>
            Tolak
          </Button>
          <Button onClick={handleApprove} loading={submitting === "approve"}>
            Lulus &amp; Rekod Serahan
          </Button>
        </div>
      )}
    </Modal>
  );
}
