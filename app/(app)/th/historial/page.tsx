// app/(app)/th/historial/page.tsx
import { redirect } from "next/navigation";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { obtenerCondicionColaboradorTH } from "../../../../lib/alcanceTH";
import PanelHistorialTH from "../../../../components/PanelHistorialTH";

export default async function HistorialTHPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) redirect("/login");

  const { sinRestriccion, condicion } = await obtenerCondicionColaboradorTH(session.id, session.rol);
  const sinAsignaciones = condicion === null;

  const colaboradores = sinAsignaciones
    ? []
    : await db.colaborador.findMany({
        where: sinRestriccion ? {} : (condicion as any),
        select: { id: true, nombreCompleto: true },
        orderBy: { nombreCompleto: "asc" },
      });

  return <PanelHistorialTH colaboradores={colaboradores} sinAsignaciones={sinAsignaciones} />;
}
