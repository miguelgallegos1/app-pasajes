// app/(app)/coordinador/revision/page.tsx
import { redirect } from "next/navigation";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { obtenerCondicionRutaTH } from "../../../../lib/alcanceTH";
import PanelCoordinador from "../../../../components/PanelCoordinador";

export default async function RevisionPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["COORDINADOR", "SUPER_ADMIN"].includes(session.rol)) redirect("/login");

  const { sinRestriccion, condicion } = await obtenerCondicionRutaTH(session.id, session.rol);
  const sinAsignaciones = condicion === null;

  const aprobadas = sinAsignaciones
    ? []
    : await db.solicitudPasaje.findMany({
        where: {
          estado: "APROBADA",
          ...(sinRestriccion ? {} : { ruta: condicion! }),
        },
        orderBy: { fechaAprobacion: "asc" },
        include: {
          colaborador: {
            select: {
              nombreCompleto: true,
              supervisorId: true,
              supervisor: { select: { nombreCompleto: true } },
            },
          },
          ruta: { include: { area: { include: { sitio: { include: { empresa: true } } } } } },
        },
      });

  const aprobadasSerializadas = aprobadas.map((s) => ({
    id: s.id,
    codigo: s.codigo,
    fecha: s.fecha.toISOString(),
    fechaAprobacion: s.fechaAprobacion?.toISOString() ?? null,
    montoTotal: Number(s.montoTotal),
    colaboradorId: s.colaboradorId,
    nombreColaborador: s.colaborador.nombreCompleto,
    supervisorId: s.colaborador.supervisorId,
    supervisorNombre: s.colaborador.supervisor?.nombreCompleto ?? null,
    empresaId: s.ruta.area.sitio.empresaId,
    empresaNombre: s.ruta.area.sitio.empresa.nombre,
    sitioId: s.ruta.area.sitioId,
    sitioNombre: s.ruta.area.sitio.nombre,
    areaId: s.ruta.areaId,
    areaNombre: s.ruta.area.nombre,
    rutaId: s.rutaId,
    rutaLabel: s.ruta.nombre,
  }));

  return (
    <PanelCoordinador
      esSuperAdmin={session.rol === "SUPER_ADMIN"}
      sinAsignaciones={sinAsignaciones}
      aprobadas={aprobadasSerializadas}
    />
  );
}
