// app/(app)/jefe/historial/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "../../../../lib/auth";
import PanelHistorialJefe from "../../../../components/PanelHistorialJefe";

export default async function HistorialJefePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["JEFE", "SUPER_ADMIN"].includes(session.rol)) redirect("/login");

  return <PanelHistorialJefe />;
}
