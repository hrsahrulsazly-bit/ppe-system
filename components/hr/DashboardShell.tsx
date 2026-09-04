"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Inbox,
  Boxes,
  Users,
  FileClock,
  Settings,
  LogOut,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";

const NAV = [
  { href: "/hr/dashboard/inbox", label: "Permohonan", icon: Inbox },
  { href: "/hr/dashboard/stock", label: "Stok PPE", icon: Boxes },
  { href: "/hr/dashboard/employees", label: "Pekerja", icon: Users },
  { href: "/hr/dashboard/records", label: "Rekod", icon: FileClock },
  { href: "/hr/dashboard/settings", label: "Tetapan", icon: Settings },
];

export default function DashboardShell({
  children,
  userEmail,
}: {
  children: ReactNode;
  userEmail: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/hr/login");
    router.refresh();
  }

  const NavLinks = (
    <nav className="space-y-1 px-3">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname?.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Icon size={18} />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen flex-1 bg-slate-50">
      {/* Sidebar - desktop */}
      <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white py-5 md:flex">
        <div className="mb-6 flex items-center gap-2 px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight text-slate-900">Sistem PPE</p>
            <p className="text-xs text-slate-400">Panel HR</p>
          </div>
        </div>
        {NavLinks}
        <div className="mt-auto space-y-2 border-t border-slate-100 px-4 pt-4">
          <p className="truncate text-xs text-slate-400" title={userEmail}>
            {userEmail}
          </p>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <LogOut size={16} /> Log Keluar
          </button>
        </div>
      </aside>

      {/* Mobile topbar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <ShieldCheck size={18} />
          </div>
          <p className="text-sm font-bold text-slate-900">Sistem PPE — HR</p>
        </div>
        <button onClick={() => setMobileOpen((v) => !v)} className="p-1">
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 top-[57px] z-30 bg-white md:hidden">
          {NavLinks}
          <div className="mt-4 space-y-2 border-t border-slate-100 px-4 pt-4">
            <p className="truncate text-xs text-slate-400">{userEmail}</p>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut size={16} /> Log Keluar
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-x-hidden px-4 py-6 pt-[72px] md:px-8 md:py-8 md:pt-8">
        {children}
      </main>
    </div>
  );
}
