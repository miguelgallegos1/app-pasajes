// app/(app)/nomina/historial/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "../../../../lib/auth";
import PanelHistorialNomina from "../../../../components/PanelHistorialNomina";

export default async function HistorialNominaPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["NOMINA", "SUPER_ADMIN"].includes(session.rol)) redirect("/login");

  return <PanelHistorialNomina />;
}
