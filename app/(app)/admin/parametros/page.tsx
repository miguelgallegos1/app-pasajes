// app/(app)/admin/parametros/page.tsx
// Solo valida sesión/rol acá: el valor se pide desde el cliente (ver
// PanelParametros) para que la pantalla se muestre de inmediato.

import { redirect } from "next/navigation";
import { getSession } from "../../../../lib/auth";
import PanelParametros from "../../../../components/PanelParametros";

export default async function ParametrosPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "SUPER_ADMIN") redirect("/login");

  return <PanelParametros />;
}
