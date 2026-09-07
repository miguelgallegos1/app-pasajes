// app/api/solicitudes/aprobar-lote/route.ts
// POST: aprueba VARIAS solicitudes a la vez. Solo aprueba las que
// realmente estén PENDIENTE y dentro del alcance del TH que las pide
// (por seguridad, ignora silenciosamente cualquier id fuera de su alcance).

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { obtenerCondicionRutaTH } from "../../../../lib/alcanceTH";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { ids } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No se enviaron solicitudes" }, { status: 400 });
  }

  const { sinRestriccion, condicion } = await obtenerCondicionRutaTH(session.id, session.rol);
  if (condicion === null) {
    return NextResponse.json({ error: "No tienes áreas asignadas" }, { status: 403 });
  }

  const solicitudesValidas = await db.solicitudPasaje.findMany({
    where: {
      id: { in: ids },
      estado: "PENDIENTE",
      ...(sinRestriccion ? {} : { ruta: condicion }),
    },
    select: { id: true },
  });

  const idsValidos = solicitudesValidas.map((s) => s.id);
  if (idsValidos.length === 0) {
    return NextResponse.json({ error: "Ninguna de las solicitudes es válida para aprobar" }, { status: 400 });
  }

  await db.solicitudPasaje.updateMany({
    where: { id: { in: idsValidos } },
    data: { estado: "APROBADA", fechaAprobacion: new Date(), aprobadoPorId: session.id },
  });

  return NextResponse.json({ aprobadas: idsValidos.length });
}