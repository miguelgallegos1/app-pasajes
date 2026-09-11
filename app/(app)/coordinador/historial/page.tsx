// app/(app)/coordinador/historial/page.tsx
import { redirect } from "next/navigation";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { obtenerCondicionColaboradorTH } from "../../../../lib/alcanceTH";
import PanelHistorialCoordinador from "../../../../components/PanelHistorialCoordinador";

export default async function HistorialCoordinadorPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["COORDINADOR", "SUPER_ADMIN"].includes(session.rol)) redirect("/login");

  const { sinRestriccion, condicion } = await obtenerCondicionColaboradorTH(session.id, session.rol);
  const sinAsignaciones = condicion === null;

  const colaboradores = sinAsignaciones
    ? []
    : await db.colaborador.findMany({
        where: sinRestriccion ? {} : (condicion as any),
        select: { id: true, nombreCompleto: true },
        orderBy: { nombreCompleto: "asc" },
      });

  return <PanelHistorialCoordinador colaboradores={colaboradores} sinAsignaciones={sinAsignaciones} />;
}
