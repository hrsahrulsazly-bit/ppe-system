import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/hr/DashboardShell";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/hr/dashboard">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/hr/login");
  }

  return (
    <DashboardShell userEmail={user.email ?? ""}>{children}</DashboardShell>
  );
}
