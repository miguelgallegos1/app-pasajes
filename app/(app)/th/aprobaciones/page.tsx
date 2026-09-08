// app/(app)/th/aprobaciones/page.tsx
import { redirect } from "next/navigation";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { obtenerCondicionRutaTH } from "../../../../lib/alcanceTH";
import PanelTH from "../../../../components/PanelTH";

export default async function AprobacionesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) redirect("/login");

  const { sinRestriccion, condicion } = await obtenerCondicionRutaTH(session.id, session.rol);
  const sinAsignaciones = condicion === null;

  const pendientes = sinAsignaciones
    ? []
    : await db.solicitudPasaje.findMany({
        where: {
          estado: "PENDIENTE",
          ...(sinRestriccion ? {} : { ruta: condicion! }),
        },
        orderBy: { fecha: "asc" },
        include: {
          colaborador: { select: { nombreCompleto: true } },
          ruta: { select: { nombre: true } },
        },
      });

  const pendientesSerializadas = pendientes.map((s) => ({
    id: s.id,
    codigo: s.codigo,
    fecha: s.fecha.toISOString(),
    fechaSolicitud: s.fechaSolicitud.toISOString(),
    montoTotal: Number(s.montoTotal),
    observaciones: s.observaciones,
    nombreColaborador: s.colaborador.nombreCompleto,
    rutaLabel: s.ruta.nombre,
  }));

  return (
    <PanelTH
      esSuperAdmin={session.rol === "SUPER_ADMIN"}
      sinAsignaciones={sinAsignaciones}
      pendientes={pendientesSerializadas}
    />
  );
}
