// app/api/nomina/pagos/revisadas/route.ts
// Cola de solicitudes REVISADAS listas para pagar. Se pide desde el
// cliente (en vez de bloquear la navegación esperando esta consulta en el
// servidor) para que la pantalla se muestre de inmediato.

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";
import { obtenerSeleccionTotal, SELECCION_TOTAL_DEFECTO } from "../../../../../lib/parametros";
import { nombresDeUsuarios } from "../../../../../lib/nombresActores";

export async function GET() {
  const session = await getSession();
  if (!session || !["NOMINA", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  // Si esta pantalla muestra "Seleccionar todas (N)" (Admin -> Parámetros).
  // Se pide en paralelo con la cola, no suma espera; si falla, valores por defecto.
  const seleccionTotalPromesa = obtenerSeleccionTotal().catch(() => SELECCION_TOTAL_DEFECTO);

  const revisadas = await db.solicitudPasaje.findMany({
    where: { estado: "REVISADO" },
    orderBy: { fechaRevision: "asc" },
    include: {
      colaborador: { select: { nombreCompleto: true, codigoNomina: true } },
      ruta: { include: { area: { include: { sitio: { include: { empresa: true } } } } } },
    },
  });

  const nombrePorActorId = await nombresDeUsuarios(revisadas.map((s) => s.revisadoPorId));

  const revisadasSerializadas = revisadas.map((s) => ({
    id: s.id,
    codigo: s.codigo,
    fecha: s.fecha.toISOString(),
    fechaRevision: s.fechaRevision?.toISOString() ?? null,
    montoTotal: Number(s.montoTotal),
    colaboradorId: s.colaboradorId,
    nombreColaborador: s.colaborador.nombreCompleto,
    codigoNomina: s.colaborador.codigoNomina,
    revisadoPor: s.revisadoPorId ? (nombrePorActorId.get(s.revisadoPorId) ?? null) : null,
    empresaId: s.ruta.area.sitio.empresaId,
    empresaNombre: s.ruta.area.sitio.empresa.nombre,
    sitioId: s.ruta.area.sitioId,
    sitioNombre: s.ruta.area.sitio.nombre,
    areaId: s.ruta.areaId,
    areaNombre: s.ruta.area.nombre,
    rutaId: s.rutaId,
    rutaNombre: s.ruta.nombre,
  }));

  return NextResponse.json({ revisadas: revisadasSerializadas, seleccionTotal: (await seleccionTotalPromesa).pagar });
}
