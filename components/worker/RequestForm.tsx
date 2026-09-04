"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { CATEGORY_RULES, eligibleItemsFor } from "@/lib/ppe-config";
import { Search, CheckCircle2, ArrowLeft, Loader2 } from "lucide-react";

interface EmployeeLite {
  id: string;
  staff_id: string;
  comp_code: string | null;
  branch: string | null;
  name: string;
  position: string;
}

interface SelectedItemState {
  checked: boolean;
  size: string;
  qty: number;
}

export default function RequestForm() {
  const supabase = useMemo(() => createClient(), []);

  const [step, setStep] = useState<"search" | "form" | "success">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EmployeeLite[]>([]);
  const [searching, setSearching] = useState(false);
  const [employee, setEmployee] = useState<EmployeeLite | null>(null);

  const [selection, setSelection] = useState<Record<string, SelectedItemState>>({});
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSubmittedItems, setLastSubmittedItems] = useState<
    { name: string; size: string | null; qty: number }[]
  >([]);

  // Cari nama pekerja (debounced)
  useEffect(() => {
    if (query.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale results when query is too short
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      const { data, error: err } = await supabase
        .from("employees_public")
        .select("id, staff_id, comp_code, branch, name, position")
        .ilike("name", `%${query.trim()}%`)
        .order("name")
        .limit(10);
      if (!cancelled) {
        if (!err) setResults((data as EmployeeLite[]) ?? []);
        setSearching(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, supabase]);

  function selectEmployee(emp: EmployeeLite) {
    setEmployee(emp);
    const eligible = eligibleItemsFor(emp.position);
    const initial: Record<string, SelectedItemState> = {};
    for (const item of eligible) {
      initial[item.itemId] = { checked: false, size: "", qty: 1 };
    }
    setSelection(initial);
    setNote("");
    setError(null);
    setStep("form");
  }

  function resetAll() {
    setStep("search");
    setQuery("");
    setResults([]);
    setEmployee(null);
    setSelection({});
    setNote("");
    setError(null);
  }

  function toggleItem(itemId: string) {
    setSelection((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], checked: !prev[itemId].checked },
    }));
  }

  function updateSize(itemId: string, size: string) {
    setSelection((prev) => ({ ...prev, [itemId]: { ...prev[itemId], size } }));
  }

  function updateQty(itemId: string, qty: number) {
    setSelection((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], qty: Math.max(1, qty) },
    }));
  }

  const eligibleItems = employee ? eligibleItemsFor(employee.position) : [];
  const anyChecked = Object.values(selection).some((s) => s.checked);

  async function handleSubmit() {
    if (!employee) return;
    setError(null);

    const chosen = eligibleItems.filter((item) => selection[item.itemId]?.checked);
    if (chosen.length === 0) {
      setError("Sila pilih sekurang-kurangnya satu item PPE.");
      return;
    }
    for (const item of chosen) {
      const rule = CATEGORY_RULES[item.category];
      if (rule.needsSize && !selection[item.itemId].size) {
        setError(`Sila pilih saiz untuk ${item.name}.`);
        return;
      }
    }

    const itemsPayload = chosen.map((item) => {
      const sel = selection[item.itemId];
      const rule = CATEGORY_RULES[item.category];
      const qty = rule.qtyEditable ? sel.qty : 1;
      return {
        itemId: item.itemId,
        name: item.name,
        category: item.category,
        size: rule.needsSize ? sel.size : null,
        qtyRequested: qty,
        qtyIssued: qty,
      };
    });

    setSubmitting(true);
    const { error: insertError } = await supabase.from("requests").insert({
      employee_id: employee.id,
      employee_name: employee.name,
      staff_id: employee.staff_id,
      comp_code: employee.comp_code,
      branch: employee.branch,
      ic_number: null,
      position: employee.position,
      items: itemsPayload,
      note,
      status: "pending",
    });
    setSubmitting(false);

    if (insertError) {
      setError("Gagal menghantar permohonan. Sila cuba semula.");
      return;
    }

    setLastSubmittedItems(
      itemsPayload.map((i) => ({ name: i.name, size: i.size, qty: i.qtyRequested }))
    );
    setStep("success");
  }

  if (step === "success") {
    return (
      <Card>
        <CardBody className="flex flex-col items-center py-10 text-center">
          <CheckCircle2 className="mb-4 text-emerald-500" size={56} />
          <h2 className="text-lg font-semibold text-slate-900">
            Permohonan Berjaya Dihantar
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Terima kasih, {employee?.name}. Permohonan anda akan disemak oleh HR.
          </p>
          <ul className="mt-4 w-full max-w-sm rounded-lg bg-slate-50 p-4 text-left text-sm text-slate-700">
            {lastSubmittedItems.map((i, idx) => (
              <li key={idx} className="flex justify-between border-b border-slate-100 py-1.5 last:border-0">
                <span>
                  {i.name}
                  {i.size ? ` (${i.size})` : ""}
                </span>
                <span className="font-medium">x{i.qty}</span>
              </li>
            ))}
          </ul>
          <Button className="mt-6" onClick={resetAll}>
            Hantar Permohonan Lain
          </Button>
        </CardBody>
      </Card>
    );
  }

  if (step === "form" && employee) {
    return (
      <Card>
        <CardBody>
          <button
            onClick={resetAll}
            className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft size={16} /> Bukan saya / cari semula
          </button>

          <div className="mb-5 rounded-lg bg-slate-50 p-4">
            <p className="font-semibold text-slate-900">{employee.name}</p>
            <p className="text-sm text-slate-500">
              No. Staf: {employee.staff_id}
              {employee.branch ? ` · ${employee.branch}` : ""} · {employee.position}
            </p>
          </div>

          <h3 className="mb-3 text-sm font-semibold text-slate-700">
            Pilih PPE yang diperlukan
          </h3>
          <div className="space-y-3">
            {eligibleItems.map((item) => {
              const rule = CATEGORY_RULES[item.category];
              const sel = selection[item.itemId];
              if (!sel) return null;
              return (
                <div
                  key={item.itemId}
                  className={`rounded-lg border p-3 transition-colors ${
                    sel.checked ? "border-blue-300 bg-blue-50/50" : "border-slate-200"
                  }`}
                >
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={sel.checked}
                      onChange={() => toggleItem(item.itemId)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium text-slate-800">{item.name}</span>
                    <span className="text-xs text-slate-400">({item.unit})</span>
                  </label>

                  {sel.checked && (
                    <div className="mt-3 flex flex-wrap items-center gap-4 pl-7">
                      {rule.needsSize && (
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-slate-500">Saiz:</label>
                          <select
                            value={sel.size}
                            onChange={(e) => updateSize(item.itemId, e.target.value)}
                            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                          >
                            <option value="">Pilih</option>
                            {rule.sizeOptions?.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {rule.qtyEditable ? (
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-slate-500">Kuantiti:</label>
                          <input
                            type="number"
                            min={1}
                            value={sel.qty}
                            onChange={(e) => updateQty(item.itemId, parseInt(e.target.value) || 1)}
                            className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm"
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">Kuantiti: 1 (tetap)</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-5">
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Catatan (pilihan)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Cth: helmet lama rosak, perlu gantian"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          {error && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <Button
            className="mt-5 w-full"
            size="lg"
            onClick={handleSubmit}
            loading={submitting}
            disabled={!anyChecked}
          >
            Hantar Permohonan
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Cari nama anda
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Taip nama penuh anda..."
            className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" size={18} />
          )}
        </div>

        {results.length > 0 && (
          <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
            {results.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => selectEmployee(r)}
                  className="flex w-full flex-col items-start px-4 py-3 text-left hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-800">{r.name}</span>
                  <span className="text-xs text-slate-500">
                    No. Staf: {r.staff_id} {r.branch ? `· ${r.branch}` : ""} · {r.position}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {query.trim().length >= 2 && !searching && results.length === 0 && (
          <p className="mt-3 text-sm text-slate-400">
            Tiada nama sepadan dijumpai. Sila hubungi HR jika nama anda tiada dalam sistem.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
