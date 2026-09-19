// app/(app)/admin/empresas/page.tsx
// Solo valida sesión/rol acá: el árbol de empresas se pide desde el
// cliente (ver PanelEmpresas) para que la pantalla se muestre de
// inmediato en vez de bloquear la navegación esperando esa consulta en el
// servidor.

import { redirect } from "next/navigation";
import { getSession } from "../../../../lib/auth";
import PanelEmpresas from "../../../../components/PanelEmpresas";

export default async function EmpresasPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "SUPER_ADMIN") redirect("/login");

  return <PanelEmpresas />;
}
