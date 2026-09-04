import { redirect } from "next/navigation";

export default function HrIndex() {
  redirect("/hr/dashboard/inbox");
}
