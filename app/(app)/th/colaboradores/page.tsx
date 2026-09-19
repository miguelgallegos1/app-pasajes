// app/(app)/th/colaboradores/page.tsx
// Solo valida sesión/rol acá: el listado se pide desde el cliente (ver
// PanelColaboradoresTH) para que la pantalla se muestre de inmediato en
// vez de bloquear la navegación esperando esa consulta en el servidor.

import { redirect } from "next/navigation";
import { getSession } from "../../../../lib/auth";
import PanelColaboradoresTH from "../../../../components/PanelColaboradoresTH";

export default async function ColaboradoresPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) redirect("/login");

  return <PanelColaboradoresTH />;
}
