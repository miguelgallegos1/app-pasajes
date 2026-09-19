// app/(app)/mis-pasajes/historial/page.tsx
// "Historial" como página propia del menú (antes era un modal escondido
// dentro de Mis Pasajes) — mismo patrón que usan Coordinación/Nómina/TH.
//
// Solo valida sesión acá: el equipo (si es supervisor) se pide desde el
// cliente (ver PanelHistorialColaborador) para que la pantalla se muestre
// de inmediato en vez de bloquear la navegación esperando esa consulta.

import { redirect } from "next/navigation";
import { getSession } from "../../../../lib/auth";
import PanelHistorialColaborador from "../../../../components/PanelHistorialColaborador";

export default async function HistorialColaboradorPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <PanelHistorialColaborador />;
}
