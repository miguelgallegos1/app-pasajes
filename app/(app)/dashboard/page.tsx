// app/(app)/dashboard/page.tsx
// Solo valida sesión/rol acá: es la primera pantalla que se ve después del
// login, así que es la que más importa que se muestre de inmediato — los
// datos (empresas/sitios/áreas, alerta) se piden desde el cliente (ver
// PanelDashboard) en vez de bloquear la navegación esperando esa consulta
// en el servidor.

import { redirect } from "next/navigation";
import { getSession } from "../../../lib/auth";
import PanelDashboard from "../../../components/PanelDashboard";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["ADMIN_TH", "COORDINADOR", "NOMINA", "JEFE", "SUPER_ADMIN"].includes(session.rol)) redirect("/login");

  return <PanelDashboard />;
}
