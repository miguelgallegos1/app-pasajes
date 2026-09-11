// app/api/solicitudes/[id]/aprobar/route.ts
// PATCH: Talento Humano (o Super Admin) aprueba una solicitud pendiente.

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";
import { obtenerCondicionRutaTH } from "../../../../../lib/alcanceTH";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;

  // Un TH con áreas asignadas solo puede aprobar solicitudes de rutas
  // dentro de su alcance, igual que en aprobar-lote (la ruta de una
  // solicitud no cambia, así que basta verificarlo con una lectura previa).
  const { sinRestriccion, condicion } = await obtenerCondicionRutaTH(session.id, session.rol);
  if (condicion === null) {
    return NextResponse.json({ error: "No tienes áreas asignadas" }, { status: 403 });
  }
  const enAlcance = await db.solicitudPasaje.findFirst({
    where: { id, ...(sinRestriccion ? {} : { ruta: condicion }) },
    select: { id: true },
  });
  if (!enAlcance) {
    return NextResponse.json(
      { error: "Solo se pueden aprobar solicitudes pendientes" },
      { status: 400 }
    );
  }

  // El estado se exige dentro del propio WHERE del UPDATE (no en una
  // lectura previa) para que la condición se verifique de forma atómica:
  // si otra petición concurrente ya cambió el estado, count será 0 en
  // vez de pisar un cambio que ya no aplica (ver AGENTS.md/CLAUDE.md).
  const resultado = await db.solicitudPasaje.updateMany({
    where: { id, estado: "PENDIENTE" },
    data: {
      estado: "APROBADA",
      fechaAprobacion: new Date(),
      aprobadoPorId: session.id,
    },
  });

  if (resultado.count === 0) {
    return NextResponse.json(
      { error: "Solo se pueden aprobar solicitudes pendientes" },
      { status: 400 }
    );
  }

  const actualizada = await db.solicitudPasaje.findUnique({ where: { id } });
  return NextResponse.json(actualizada);
}