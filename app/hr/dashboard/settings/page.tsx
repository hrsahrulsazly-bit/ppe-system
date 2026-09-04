"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase
      .from("settings")
      .select("company_name")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        setCompanyName(data?.company_name ?? "");
        setLoading(false);
      });
  }, [supabase]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await supabase
      .from("settings")
      .update({ company_name: companyName, updated_at: new Date().toISOString() })
      .eq("id", 1);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-slate-900">Tetapan</h1>

      <Card className="max-w-lg">
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-700">Maklumat Syarikat</h2>
        </CardHeader>
        <CardBody>
          {loading ? (
            <Loader2 className="animate-spin text-slate-400" size={20} />
          ) : (
            <>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Nama Syarikat
              </label>
              <p className="mb-3 text-xs text-slate-400">
                Dipaparkan pada borang permohonan pekerja dan borang PDF serahan.
              </p>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              <div className="mt-4 flex items-center gap-3">
                <Button onClick={handleSave} loading={saving}>
                  Simpan
                </Button>
                {saved && (
                  <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
                    <CheckCircle2 size={16} /> Disimpan
                  </span>
                )}
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
