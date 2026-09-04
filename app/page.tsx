import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import RequestForm from "@/components/worker/RequestForm";
import { ShieldCheck } from "lucide-react";

export default async function Home() {
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
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            {companyName}
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Borang Permohonan Peralatan Perlindungan Diri (PPE)
          </p>
        </header>

        <RequestForm />

        <footer className="mt-10 text-center text-xs text-slate-400">
          Staf HR? <Link href="/hr/login" className="underline hover:text-slate-600">Log masuk di sini</Link>
        </footer>
      </div>
    </div>
  );
}
