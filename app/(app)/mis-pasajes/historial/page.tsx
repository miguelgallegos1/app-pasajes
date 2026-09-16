// app/(app)/mis-pasajes/historial/page.tsx
// "Historial" como página propia del menú (antes era un modal escondido
// dentro de Mis Pasajes) — mismo patrón que usan Coordinación/Nómina/TH.

import { redirect } from "next/navigation";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import PanelHistorialColaborador from "../../../../components/PanelHistorialColaborador";

export default async function HistorialColaboradorPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const colaborador = await db.colaborador.findUnique({ where: { usuarioId: session.id } });
  if (!colaborador) redirect("/login");

  const equipo = colaborador.esSupervisor
    ? await db.colaborador.findMany({
        where: { supervisorId: colaborador.id, estado: "ACTIVO" },
        select: { id: true, nombreCompleto: true },
        orderBy: { nombreCompleto: "asc" },
      })
    : [];

  return <PanelHistorialColaborador esSupervisor={colaborador.esSupervisor} equipo={equipo} />;
}
