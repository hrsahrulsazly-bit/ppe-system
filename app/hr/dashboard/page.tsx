import { redirect } from "next/navigation";

export default function DashboardIndex() {
  redirect("/hr/dashboard/inbox");
}
