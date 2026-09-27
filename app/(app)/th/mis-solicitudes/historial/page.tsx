// app/(app)/th/mis-solicitudes/historial/page.tsx
// Mis solicitudes -> Historial (Talento Humano): el historial del
// colaborador (PanelHistorialColaborador) en modo "th": lo aprobado,
// revisado y pagado que este usuario registró.

import { redirect } from "next/navigation";
import { getSession } from "../../../../../lib/auth";
import PanelHistorialColaborador from "../../../../../components/PanelHistorialColaborador";

export default async function HistorialMisSolicitudesTHPage() {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) redirect("/login");

  return <PanelHistorialColaborador modo="th" />;
}
