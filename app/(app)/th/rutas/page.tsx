// app/(app)/th/rutas/page.tsx
// Solo valida sesión/rol acá: las rutas se piden desde el cliente (ver
// PanelRutasTH) para que la pantalla se muestre de inmediato en vez de
// bloquear la navegación esperando esa consulta en el servidor.

import { redirect } from "next/navigation";
import { getSession } from "../../../../lib/auth";
import PanelRutasTH from "../../../../components/PanelRutasTH";

export default async function RutasPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) redirect("/login");

  return <PanelRutasTH />;
}
