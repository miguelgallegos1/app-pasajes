// app/(app)/dashboard/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "../../../lib/auth";
import PanelDashboard from "../../../components/PanelDashboard";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["ADMIN_TH", "SUPER_ADMIN", "FINANZAS"].includes(session.rol)) redirect("/login");

  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const desdeDefecto = primerDiaMes.toISOString().split("T")[0];
  const hastaDefecto = hoy.toISOString().split("T")[0];

  return <PanelDashboard desdeDefecto={desdeDefecto} hastaDefecto={hastaDefecto} />;
}
