// app/api/nomina/pagos/revisadas/route.ts
// Cola de solicitudes REVISADAS listas para pagar. Se pide desde el
// cliente (en vez de bloquear la navegación esperando esta consulta en el
// servidor) para que la pantalla se muestre de inmediato.

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || !["NOMINA", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const revisadas = await db.solicitudPasaje.findMany({
    where: { estado: "REVISADO" },
    orderBy: { fechaRevision: "asc" },
    include: {
      colaborador: { select: { nombreCompleto: true } },
      ruta: { include: { area: { include: { sitio: { include: { empresa: true } } } } } },
    },
  });

  const revisadasSerializadas = revisadas.map((s) => ({
    id: s.id,
    codigo: s.codigo,
    fecha: s.fecha.toISOString(),
    fechaRevision: s.fechaRevision?.toISOString() ?? null,
    montoTotal: Number(s.montoTotal),
    colaboradorId: s.colaboradorId,
    nombreColaborador: s.colaborador.nombreCompleto,
    empresaId: s.ruta.area.sitio.empresaId,
    empresaNombre: s.ruta.area.sitio.empresa.nombre,
    sitioId: s.ruta.area.sitioId,
    sitioNombre: s.ruta.area.sitio.nombre,
    areaId: s.ruta.areaId,
    areaNombre: s.ruta.area.nombre,
    rutaId: s.rutaId,
    rutaNombre: s.ruta.nombre,
  }));

  return NextResponse.json({ revisadas: revisadasSerializadas });
}
