// app/api/coordinador/revision/aprobadas/route.ts
// Cola de solicitudes APROBADAS dentro del alcance del Coordinador. Se pide
// desde el cliente (en vez de bloquear la navegación esperando esta
// consulta en el servidor) para que la pantalla se muestre de inmediato.

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";
import { nombresDeUsuarios } from "../../../../../lib/nombresActores";
import { obtenerCondicionRutaTH } from "../../../../../lib/alcanceTH";

export async function GET() {
  const session = await getSession();
  if (!session || !["COORDINADOR", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { sinRestriccion, condicion } = await obtenerCondicionRutaTH(session.id, session.rol);
  const sinAsignaciones = condicion === null;

  const aprobadas = sinAsignaciones
    ? []
    : await db.solicitudPasaje.findMany({
        where: {
          estado: "APROBADA",
          ...(sinRestriccion ? {} : { ruta: condicion as object }),
        },
        orderBy: { fechaAprobacion: "asc" },
        include: {
          colaborador: {
            select: {
              nombreCompleto: true,
              codigoNomina: true,
              supervisorId: true,
              supervisor: { select: { nombreCompleto: true } },
            },
          },
          ruta: { include: { area: { include: { sitio: { include: { empresa: true } } } } } },
        },
      });

  const nombrePorActorId = await nombresDeUsuarios(aprobadas.map((s) => s.aprobadoPorId));

  const aprobadasSerializadas = aprobadas.map((s) => ({
    id: s.id,
    codigo: s.codigo,
    fecha: s.fecha.toISOString(),
    fechaAprobacion: s.fechaAprobacion?.toISOString() ?? null,
    montoTotal: Number(s.montoTotal),
    colaboradorId: s.colaboradorId,
    nombreColaborador: s.colaborador.nombreCompleto,
    codigoNomina: s.colaborador.codigoNomina,
    aprobadoPor: s.aprobadoPorId ? (nombrePorActorId.get(s.aprobadoPorId) ?? null) : null,
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

  return NextResponse.json({ aprobadas: aprobadasSerializadas, sinAsignaciones });
}
