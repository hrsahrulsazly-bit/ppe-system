"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { JAWATAN_OPTIONS } from "@/lib/ppe-config";
import { CheckCircle2, ArrowLeft } from "lucide-react";

const EMPTY = { name: "", staff_id: "", ic_number: "", comp_code: "", branch: "", position: "" };

export default function NewStaffForm() {
  const supabase = useMemo(() => createClient(), []);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  function set(field: keyof typeof EMPTY, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const name = form.name.trim().toUpperCase();
    const staffId = form.staff_id.trim().toUpperCase();
    const ic = form.ic_number.trim();

    if (!name || !staffId || !ic || !form.position) {
      setError("Sila isi Nama, No. Staf, No. IC/Passport dan Jawatan.");
      return;
    }

    setSubmitting(true);

    const { data: existing } = await supabase
      .from("employees_public")
      .select("id")
      .eq("staff_id", staffId)
      .limit(1);
    if (existing && existing.length > 0) {
      setSubmitting(false);
      setError("No. Staf ini sudah wujud dalam sistem. Sila kembali dan cari nama anda untuk memohon PPE.");
      return;
    }

    const { error: insertError } = await supabase.from("employee_registrations").insert({
      staff_id: staffId,
      name,
      ic_number: ic,
      comp_code: form.comp_code.trim().toUpperCase() || null,
      branch: form.branch.trim().toUpperCase() || null,
      position: form.position,
      status: "pending",
    });
    setSubmitting(false);

    if (insertError) {
      setError(
        insertError.code === "23505"
          ? "No. Staf ini sudah didaftarkan dan sedang menunggu semakan HR."
          : "Gagal menghantar pendaftaran. Sila cuba semula."
      );
      return;
    }

    setDone(name);
  }

  if (done) {
    return (
      <Card>
        <CardBody className="flex flex-col items-center py-10 text-center">
          <CheckCircle2 className="mb-4 text-emerald-500" size={56} />
          <h2 className="text-lg font-semibold text-slate-900">Pendaftaran Berjaya Dihantar</h2>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Terima kasih, {done}. HR akan menyemak maklumat anda. Selepas diluluskan, anda boleh
            mencari nama anda di borang permohonan PPE.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Kembali ke Borang PPE
          </Link>
        </CardBody>
      </Card>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

  return (
    <Card>
      <CardBody>
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft size={16} /> Kembali
        </Link>
        <h2 className="mb-1 text-base font-semibold text-slate-900">Daftar Staf Baru</h2>
        <p className="mb-5 text-sm text-slate-500">
          Isi maklumat anda. Pendaftaran akan disemak oleh HR sebelum anda boleh memohon PPE.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nama Penuh *</label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={inputClass}
              placeholder="Seperti dalam kad pengenalan"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">No. Staf *</label>
              <input
                value={form.staff_id}
                onChange={(e) => set("staff_id", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                No. IC / Passport *
              </label>
              <input
                value={form.ic_number}
                onChange={(e) => set("ic_number", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Comp Code</label>
              <input
                value={form.comp_code}
                onChange={(e) => set("comp_code", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Branch</label>
              <input
                value={form.branch}
                onChange={(e) => set("branch", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Jawatan *</label>
            <select
              value={form.position}
              onChange={(e) => set("position", e.target.value)}
              className={inputClass}
            >
              <option value="">Pilih jawatan</option>
              {JAWATAN_OPTIONS.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <Button type="submit" size="lg" className="w-full" loading={submitting}>
            Hantar Pendaftaran
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
