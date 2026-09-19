// app/(app)/coordinador/historial/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "../../../../lib/auth";
import PanelHistorialCoordinador from "../../../../components/PanelHistorialCoordinador";

export default async function HistorialCoordinadorPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["COORDINADOR", "SUPER_ADMIN"].includes(session.rol)) redirect("/login");

  return <PanelHistorialCoordinador />;
}
