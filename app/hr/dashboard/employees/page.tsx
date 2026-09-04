"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Employee } from "@/lib/types";
import { JAWATAN_OPTIONS } from "@/lib/ppe-config";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ImportModal from "@/components/hr/ImportModal";
import {
  downloadEmployeeTemplate,
  parseEmployeeFile,
  importEmployees,
  exportEmployees,
  EmployeeRowData,
} from "@/lib/excel/employees";
import { Download, Upload, Loader2, Plus, Pencil, Trash2, Search } from "lucide-react";

const EMPTY_FORM: EmployeeRowData = {
  staff_id: "",
  comp_code: "",
  branch: "",
  name: "",
  ic_number: "",
  position: JAWATAN_OPTIONS[0],
};

export default function EmployeesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeRowData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("employees").select("*").order("name");
    setEmployees((data as Employee[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    loadEmployees();
  }, [loadEmployees]);

  const filtered = employees.filter((e) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return e.name.toLowerCase().includes(q) || e.staff_id.toLowerCase().includes(q);
  });

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(emp: Employee) {
    setEditingId(emp.id);
    setForm({
      staff_id: emp.staff_id,
      comp_code: emp.comp_code,
      branch: emp.branch,
      name: emp.name,
      ic_number: emp.ic_number,
      position: emp.position,
    });
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSave() {
    if (!form.staff_id.trim() || !form.name.trim()) {
      setFormError("No. Staf dan Nama wajib diisi.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      staff_id: form.staff_id.trim(),
      comp_code: form.comp_code?.trim() || null,
      branch: form.branch?.trim() || null,
      name: form.name.trim(),
      ic_number: form.ic_number?.trim() || null,
      position: form.position,
    };
    const { error } = editingId
      ? await supabase.from("employees").update(payload).eq("id", editingId)
      : await supabase.from("employees").insert(payload);
    setSaving(false);
    if (error) {
      setFormError(error.message.includes("duplicate") ? "No. Staf sudah wujud." : error.message);
      return;
    }
    setFormOpen(false);
    loadEmployees();
  }

  async function handleDelete(emp: Employee) {
    if (!confirm(`Padam rekod pekerja "${emp.name}"?`)) return;
    await supabase.from("employees").delete().eq("id", emp.id);
    loadEmployees();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Pangkalan Data Pekerja</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => exportEmployees(employees)}>
            <Download size={16} /> Eksport
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload size={16} /> Import Excel
          </Button>
          <Button onClick={openAdd}>
            <Plus size={16} /> Tambah Pekerja
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau No. Staf..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
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
                    <th className="px-5 py-3">No. Staf</th>
                    <th className="px-5 py-3">Nama</th>
                    <th className="px-5 py-3">Comp Code</th>
                    <th className="px-5 py-3">Branch</th>
                    <th className="px-5 py-3">Jawatan</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((emp) => (
                    <tr key={emp.id}>
                      <td className="px-5 py-3 text-slate-500">{emp.staff_id}</td>
                      <td className="px-5 py-3 font-medium text-slate-800">{emp.name}</td>
                      <td className="px-5 py-3">{emp.comp_code || "-"}</td>
                      <td className="px-5 py-3">{emp.branch || "-"}</td>
                      <td className="px-5 py-3">{emp.position}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEdit(emp)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => handleDelete(emp)} className="rounded p-1.5 text-red-500 hover:bg-red-50">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                        Tiada pekerja dijumpai.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editingId ? "Kemaskini Pekerja" : "Tambah Pekerja"}>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">No. Staf</label>
            <input
              value={form.staff_id}
              onChange={(e) => setForm({ ...form, staff_id: e.target.value })}
              disabled={!!editingId}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nama</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Comp Code</label>
              <input
                value={form.comp_code ?? ""}
                onChange={(e) => setForm({ ...form, comp_code: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Branch</label>
              <input
                value={form.branch ?? ""}
                onChange={(e) => setForm({ ...form, branch: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">No. IC/Passport</label>
            <input
              value={form.ic_number ?? ""}
              onChange={(e) => setForm({ ...form, ic_number: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Jawatan</label>
            <select
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {JAWATAN_OPTIONS.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>
          {formError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>
          )}
          <Button className="w-full" onClick={handleSave} loading={saving}>
            Simpan
          </Button>
        </div>
      </Modal>

      <ImportModal<EmployeeRowData>
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Pekerja"
        helpText="Baris sedia ada dikemaskini jika No. Staf sepadan; baris baharu ditambah."
        onDownloadTemplate={downloadEmployeeTemplate}
        onParseFile={parseEmployeeFile}
        onCommit={(rows, onProgress) => importEmployees(supabase, rows, onProgress)}
        onImported={loadEmployees}
        renderRowSummary={(d) => `${d.staff_id} — ${d.name} (${d.position})`}
      />
    </div>
  );
}
