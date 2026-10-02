import { createClient } from "@/lib/supabase/server";
import NewStaffForm from "@/components/worker/NewStaffForm";
import { ShieldCheck } from "lucide-react";

export const metadata = { title: "Daftar Staf Baru — Sistem PPE" };

export default async function DaftarPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("company_name")
    .eq("id", 1)
    .maybeSingle();

  const companyName = settings?.company_name ?? "Nama Syarikat Anda";

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <header className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
            <ShieldCheck size={30} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{companyName}</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">Pendaftaran Staf Baru</p>
        </header>

        <NewStaffForm />
      </div>
    </div>
  );
}
