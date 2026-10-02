"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHrUser } from "@/lib/hooks/useHrUser";
import type { EmployeeRegistration } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { UserPlus } from "lucide-react";

export const REGISTRATIONS_CHANGED_EVENT = "registrations-changed";

export default function PendingRegistrations({ onApproved }: { onApproved: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const hrEmail = useHrUser();
  const [rows, setRows] = useState<EmployeeRegistration[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("employee_registrations")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    setRows((data as EmployeeRegistration[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    supabase
      .from("employee_registrations")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .then(({ data }) => setRows((data as EmployeeRegistration[]) ?? []));
  }, [supabase]);

  async function act(reg: EmployeeRegistration, action: "approve" | "reject") {
    setBusyId(reg.id);
    setError(null);
    const { error: rpcError } =
      action === "approve"
        ? await supabase.rpc("approve_employee_registration", {
            p_id: reg.id,
            p_processed_by: hrEmail,
          })
        : await supabase.rpc("reject_employee_registration", {
            p_id: reg.id,
            p_processed_by: hrEmail,
          });
    setBusyId(null);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    await load();
    window.dispatchEvent(new Event(REGISTRATIONS_CHANGED_EVENT));
    if (action === "approve") onApproved();
  }

  if (rows.length === 0 && !error) return null;

  return (
    <Card className="mb-6 border-amber-200">
      <CardHeader className="flex items-center gap-2 bg-amber-50/60">
        <UserPlus size={16} className="text-amber-600" />
        <h2 className="text-sm font-semibold text-slate-700">
          Pendaftaran Staf Baru Menunggu Semakan ({rows.length})
        </h2>
      </CardHeader>
      <CardBody className="p-0">
        {error && (
          <p className="m-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}
        <div className="divide-y divide-slate-100">
          {rows.map((reg) => (
            <div
              key={reg.id}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-slate-800">{reg.name}</p>
                <p className="text-xs text-slate-500">
                  No. Staf: {reg.staff_id} · IC: {reg.ic_number} · {reg.position}
                  {reg.comp_code ? ` · ${reg.comp_code}` : ""}
                  {reg.branch ? ` · ${reg.branch}` : ""}
                </p>
                <p className="text-xs text-slate-400">
                  Dihantar {new Date(reg.created_at).toLocaleString("ms-MY")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="danger"
                  disabled={busyId === reg.id}
                  onClick={() => act(reg, "reject")}
                >
                  Tolak
                </Button>
                <Button size="sm" loading={busyId === reg.id} onClick={() => act(reg, "approve")}>
                  Lulus &amp; Tambah Pekerja
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
