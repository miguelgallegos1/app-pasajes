// app/(app)/nomina/pagos/page.tsx
// Solo valida sesión/rol acá: la cola de revisadas se pide desde el
// cliente (ver PanelNomina) para que la pantalla se muestre de inmediato
// en vez de bloquear la navegación esperando esa consulta en el servidor.

import { redirect } from "next/navigation";
import { getSession } from "../../../../lib/auth";
import PanelNomina from "../../../../components/PanelNomina";

export default async function PagosPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["NOMINA", "SUPER_ADMIN"].includes(session.rol)) redirect("/login");

  return <PanelNomina />;
}
