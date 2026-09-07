// app/(app)/dashboard/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "../../../lib/auth";
import PanelDashboard from "../../../components/PanelDashboard";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["ADMIN_TH", "SUPER_ADMIN", "FINANZAS"].includes(session.rol)) redirect("/login");

  return <PanelDashboard />;
}
