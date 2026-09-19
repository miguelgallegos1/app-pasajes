// app/(app)/admin/solicitudes/page.tsx
// Solo valida sesión/rol acá: los colaboradores del filtro se piden desde
// el cliente (ver PanelControlSolicitudes) para que la pantalla se
// muestre de inmediato en vez de bloquear la navegación esperando esa
// consulta en el servidor.

import { redirect } from "next/navigation";
import { getSession } from "../../../../lib/auth";
import PanelControlSolicitudes from "../../../../components/PanelControlSolicitudes";

export default async function ControlSolicitudesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "SUPER_ADMIN") redirect("/login");

  return <PanelControlSolicitudes />;
}
