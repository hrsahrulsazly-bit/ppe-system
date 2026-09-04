import { SupabaseClient } from "@supabase/supabase-js";
import { generateHandoverPdf } from "./handover";
import type { PpeRequest } from "@/lib/types";

/**
 * Sedia semua data yang diperlukan (nama syarikat, IC pekerja terkini,
 * rekod lain tahun sama) dan jana PDF serahan bagi satu permohonan `issued`.
 */
export async function downloadHandoverPdf(supabase: SupabaseClient, request: PpeRequest) {
  const [settingsRes, employeeRes, otherRes] = await Promise.all([
    supabase.from("settings").select("company_name").eq("id", 1).maybeSingle(),
    request.employee_id
      ? supabase.from("employees").select("ic_number").eq("id", request.employee_id).maybeSingle()
      : Promise.resolve({ data: null }),
    request.processed_at
      ? supabase
          .from("requests")
          .select("*")
          .eq("staff_id", request.staff_id)
          .eq("status", "issued")
          .neq("id", request.id)
          .order("processed_at", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  const companyName = settingsRes.data?.company_name ?? "Nama Syarikat Anda";
  const resolvedIcNumber = employeeRes.data?.ic_number ?? null;

  const year = request.processed_at ? new Date(request.processed_at).getFullYear() : null;
  const otherIssuedSameYear = ((otherRes.data as PpeRequest[]) ?? []).filter((r) => {
    if (!r.processed_at || year === null) return false;
    return new Date(r.processed_at).getFullYear() === year;
  });

  generateHandoverPdf({
    companyName,
    request,
    resolvedIcNumber,
    otherIssuedSameYear,
  });
}
