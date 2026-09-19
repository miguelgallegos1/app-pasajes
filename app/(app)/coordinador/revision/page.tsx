// app/(app)/coordinador/revision/page.tsx
// Solo valida sesión/rol acá: la cola de aprobadas se pide desde el
// cliente (ver PanelCoordinador) para que la pantalla se muestre de
// inmediato en vez de bloquear la navegación esperando esa consulta en el
// servidor.

import { redirect } from "next/navigation";
import { getSession } from "../../../../lib/auth";
import PanelCoordinador from "../../../../components/PanelCoordinador";

export default async function RevisionPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["COORDINADOR", "SUPER_ADMIN"].includes(session.rol)) redirect("/login");

  return <PanelCoordinador />;
}
