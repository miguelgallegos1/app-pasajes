// app/(app)/th/mis-solicitudes/page.tsx
// Mis solicitudes -> Registrar (Talento Humano): la misma pantalla del
// colaborador (PanelColaborador) en modo "th". El acceso por rol lo
// controla proxy.ts (/th = ADMIN_TH y SUPER_ADMIN); los datos se piden
// desde el cliente para que la pantalla aparezca de inmediato.

import { redirect } from "next/navigation";
import { getSession } from "../../../../lib/auth";
import PanelColaborador from "../../../../components/PanelColaborador";

export default async function MisSolicitudesTHPage() {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) redirect("/login");

  return <PanelColaborador modo="th" />;
}
