"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHrUser } from "@/lib/hooks/useHrUser";
import type { PpeItem, PpeRequest } from "@/lib/types";
import { LOW_STOCK_THRESHOLD } from "@/lib/ppe-config";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import RequestModal from "@/components/hr/RequestModal";
import KpiTile from "@/components/hr/KpiTile";
import { Inbox as InboxIcon, PackageCheck, AlertTriangle, Loader2 } from "lucide-react";

export default function InboxPage() {
  const supabase = useMemo(() => createClient(), []);
  const hrEmail = useHrUser();

  const [pending, setPending] = useState<PpeRequest[]>([]);
  const [ppeItems, setPpeItems] = useState<PpeItem[]>([]);
  const [issuedLast30, setIssuedLast30] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PpeRequest | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);

    const [pendingRes, itemsRes, issuedRes] = await Promise.all([
      supabase
        .from("requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase.from("ppe_items").select("*").order("category").order("variant"),
      supabase
        .from("requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "issued")
        .gte("processed_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    setPending((pendingRes.data as PpeRequest[]) ?? []);
    setPpeItems((itemsRes.data as PpeItem[]) ?? []);
    setIssuedLast30(issuedRes.count ?? 0);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    loadData();
  }, [loadData]);

  const lowStockItems = ppeItems.filter((i) => i.stock <= LOW_STOCK_THRESHOLD);

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-slate-900">Papan Pemuka</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiTile label="Permohonan Menunggu" value={pending.length} icon={InboxIcon} tone="amber" />
        <KpiTile
          label="Dikeluarkan 30 Hari Lepas"
          value={issuedLast30}
          icon={PackageCheck}
          tone="emerald"
        />
        <KpiTile
          label="Item Stok Rendah"
          value={lowStockItems.length}
          icon={AlertTriangle}
          tone="red"
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-700">Jumlah Stok Semasa</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {ppeItems.map((item) => (
              <div
                key={item.id}
                className={`rounded-lg border p-3 ${
                  item.stock <= LOW_STOCK_THRESHOLD
                    ? "border-red-200 bg-red-50"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <p className="text-xs text-slate-500">{item.name}</p>
                <p
                  className={`text-lg font-bold ${
                    item.stock <= LOW_STOCK_THRESHOLD ? "text-red-600" : "text-slate-800"
                  }`}
                >
                  {item.stock} <span className="text-xs font-normal text-slate-400">{item.unit}</span>
                </p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">
            Permohonan Menunggu ({pending.length})
          </h2>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="animate-spin" size={24} />
            </div>
          ) : pending.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">
              Tiada permohonan menunggu buat masa ini.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {pending.map((req) => (
                <button
                  key={req.id}
                  onClick={() => setSelected(req)}
                  className="flex w-full flex-col gap-1 px-5 py-4 text-left hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-800">{req.employee_name}</p>
                    <p className="text-xs text-slate-500">
                      No. Staf: {req.staff_id} · {req.items.length} item ·{" "}
                      {new Date(req.created_at).toLocaleString("ms-MY")}
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
        hrEmail={hrEmail}
        onProcessed={loadData}
      />
    </div>
  );
}
