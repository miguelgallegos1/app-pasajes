// app/(app)/th/colaboradores/asignaciones/page.tsx
// Pantalla dedicada para asignar colaboradores a un supervisor (reemplaza
// el combo "Reporta a" enterrado en el modal de Colaboradores, que además
// no precargaba el supervisor actual al editar).
//
// Solo valida sesión/rol acá: los datos (colaboradores, empresas, sitios,
// áreas) se piden desde el cliente (ver PanelAsignacionEquipo) para que la
// pantalla se muestre de inmediato en vez de bloquear la navegación
// esperando esa consulta en el servidor.

import { redirect } from "next/navigation";
import { getSession } from "../../../../../lib/auth";
import PanelAsignacionEquipo from "../../../../../components/PanelAsignacionEquipo";

export default async function AsignacionEquipoPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) redirect("/login");

  return <PanelAsignacionEquipo />;
}
