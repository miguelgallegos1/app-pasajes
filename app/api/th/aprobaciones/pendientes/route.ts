// app/api/th/aprobaciones/pendientes/route.ts
// Cola de solicitudes PENDIENTES para TH. Se pide desde el cliente (en vez
// de bloquear la navegación esperando esta consulta en el servidor) para
// que la pantalla se muestre de inmediato con su propia carga.

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";
import { obtenerSeleccionTotal, SELECCION_TOTAL_DEFECTO } from "../../../../../lib/parametros";
import { obtenerCondicionRutaTH } from "../../../../../lib/alcanceTH";

export async function GET() {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  // Si esta pantalla muestra "Seleccionar todas (N)" (Admin -> Parámetros).
  // Se pide en paralelo con la cola, no suma espera; si falla, valores por defecto.
  const seleccionTotalPromesa = obtenerSeleccionTotal().catch(() => SELECCION_TOTAL_DEFECTO);

  const { sinRestriccion, condicion } = await obtenerCondicionRutaTH(session.id, session.rol);
  const sinAsignaciones = condicion === null;

  const pendientes = sinAsignaciones
    ? []
    : await db.solicitudPasaje.findMany({
        where: {
          estado: "PENDIENTE",
          ...(sinRestriccion ? {} : { ruta: condicion as object }),
        },
        orderBy: { fecha: "asc" },
        include: {
          colaborador: {
            select: {
              nombreCompleto: true,
              codigoNomina: true,
              supervisorId: true,
              supervisor: { select: { nombreCompleto: true } },
            },
          },
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
    colaboradorId: s.colaboradorId,
    nombreColaborador: s.colaborador.nombreCompleto,
    codigoNomina: s.colaborador.codigoNomina,
    supervisorId: s.colaborador.supervisorId,
    supervisorNombre: s.colaborador.supervisor?.nombreCompleto ?? null,
    rutaLabel: s.ruta.nombre,
  }));

  return NextResponse.json({ pendientes: pendientesSerializadas, sinAsignaciones, seleccionTotal: (await seleccionTotalPromesa).aprobar });
}
