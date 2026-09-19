// app/(app)/th/solicitudes/page.tsx
// Pantalla dedicada para que TH cree solicitudes a nombre de cualquier
// colaborador dentro de su alcance de Empresa/Sitio/Área (ver
// lib/alcanceTH.ts) — no hace falta ser su supervisor directo. Mismo
// patrón que Asignar rutas: elegir un colaborador de la lista, marcar sus
// rutas, listo.
//
// Solo valida sesión/rol acá: los datos se piden desde el cliente (ver
// PanelSolicitudesTH) para que la pantalla se muestre de inmediato en vez
// de bloquear la navegación esperando esa consulta en el servidor.

import { redirect } from "next/navigation";
import { getSession } from "../../../../lib/auth";
import PanelSolicitudesTH from "../../../../components/PanelSolicitudesTH";

export default async function SolicitudesTHPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) redirect("/login");

  return <PanelSolicitudesTH />;
}
