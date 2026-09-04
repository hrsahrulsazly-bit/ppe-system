"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { ParsedRow, ImportProgress } from "@/lib/excel/shared";
import { Download, Upload, CheckCircle2, AlertTriangle } from "lucide-react";

interface ImportResult {
  success: number;
  failed: number;
  failedRows: { message: string }[];
}

export default function ImportModal<T>({
  open,
  onClose,
  title,
  helpText,
  onDownloadTemplate,
  onParseFile,
  onCommit,
  onImported,
  renderRowSummary,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  helpText?: string;
  onDownloadTemplate: () => void;
  onParseFile: (file: File) => Promise<ParsedRow<T>[]>;
  onCommit: (
    validRows: T[],
    onProgress: (p: ImportProgress) => void
  ) => Promise<ImportResult>;
  onImported?: () => void;
  renderRowSummary: (data: T) => string;
}) {
  const [stage, setStage] = useState<"idle" | "preview" | "importing" | "done">("idle");
  const [rows, setRows] = useState<ParsedRow<T>[]>([]);
  const [progress, setProgress] = useState<ImportProgress>({ done: 0, total: 0 });
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parsing, setParsing] = useState(false);

  const validRows = rows.filter((r) => r.data !== null);
  const invalidRows = rows.filter((r) => r.data === null);

  function reset() {
    setStage("idle");
    setRows([]);
    setProgress({ done: 0, total: 0 });
    setResult(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    try {
      const parsed = await onParseFile(file);
      setRows(parsed);
      setStage("preview");
    } finally {
      setParsing(false);
      e.target.value = "";
    }
  }

  async function handleConfirmImport() {
    setStage("importing");
    const data = validRows.map((r) => r.data as T);
    const res = await onCommit(data, setProgress);
    setResult(res);
    setStage("done");
    onImported?.();
  }

  return (
    <Modal open={open} onClose={handleClose} title={title} wide>
      {helpText && <p className="mb-4 text-sm text-slate-500">{helpText}</p>}

      {stage === "idle" && (
        <div className="flex flex-col items-center gap-4 py-6">
          <Button variant="outline" onClick={onDownloadTemplate}>
            <Download size={16} /> Muat Turun Templat
          </Button>
          <div className="w-full border-t border-dashed border-slate-200 pt-4 text-center">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              <Upload size={16} />
              {parsing ? "Memproses fail..." : "Muat Naik Fail Excel"}
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                disabled={parsing}
                onChange={handleFile}
              />
            </label>
          </div>
        </div>
      )}

      {stage === "preview" && (
        <div>
          <div className="mb-3 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-800">
              {validRows.length} baris sah
            </span>
            <span className="rounded-full bg-red-100 px-3 py-1 font-medium text-red-700">
              {invalidRows.length} baris ralat
            </span>
          </div>
          <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Baris</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Butiran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.rowNum}>
                    <td className="px-3 py-2 text-slate-500">{r.rowNum}</td>
                    <td className="px-3 py-2">
                      {r.data ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 size={14} /> Sah
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600">
                          <AlertTriangle size={14} /> Ralat
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {r.data ? renderRowSummary(r.data) : r.errors.join("; ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={reset}>
              Muat Naik Fail Lain
            </Button>
            <Button onClick={handleConfirmImport} disabled={validRows.length === 0}>
              Sahkan Import ({validRows.length})
            </Button>
          </div>
        </div>
      )}

      {stage === "importing" && (
        <div className="flex flex-col items-center gap-3 py-10">
          <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{
                width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
              }}
            />
          </div>
          <p className="text-sm text-slate-500">
            Mengimport {progress.done}/{progress.total}...
          </p>
        </div>
      )}

      {stage === "done" && result && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <CheckCircle2 className="text-emerald-500" size={44} />
          <p className="font-medium text-slate-800">
            {result.success} rekod berjaya diimport
            {result.failed > 0 ? `, ${result.failed} gagal` : ""}.
          </p>
          {result.failed > 0 && (
            <ul className="max-h-32 w-full max-w-md overflow-y-auto rounded-lg bg-red-50 p-3 text-left text-xs text-red-700">
              {result.failedRows.slice(0, 20).map((f, idx) => (
                <li key={idx}>{f.message}</li>
              ))}
            </ul>
          )}
          <Button onClick={handleClose}>Tutup</Button>
        </div>
      )}
    </Modal>
  );
}
