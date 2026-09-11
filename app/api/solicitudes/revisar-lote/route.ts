// app/api/solicitudes/revisar-lote/route.ts
// POST: marca VARIAS solicitudes aprobadas como revisadas a la vez. Solo
// revisa las que realmente estén APROBADA y dentro del alcance del
// Coordinador que las pide (ignora silenciosamente cualquier id fuera de
// su alcance, igual que aprobar-lote).

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { obtenerCondicionRutaTH } from "../../../../lib/alcanceTH";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !["COORDINADOR", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { ids } = await req.json().catch(() => ({ ids: null }));
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((v) => typeof v === "string")) {
    return NextResponse.json({ error: "No se enviaron solicitudes" }, { status: 400 });
  }

  const { sinRestriccion, condicion } = await obtenerCondicionRutaTH(session.id, session.rol);
  if (condicion === null) {
    return NextResponse.json({ error: "No tienes áreas asignadas" }, { status: 403 });
  }

  const solicitudesValidas = await db.solicitudPasaje.findMany({
    where: {
      id: { in: ids },
      estado: "APROBADA",
      ...(sinRestriccion ? {} : { ruta: condicion }),
    },
    select: { id: true },
  });

  const idsValidos = solicitudesValidas.map((s) => s.id);
  if (idsValidos.length === 0) {
    return NextResponse.json({ error: "Ninguna de las solicitudes es válida para revisar" }, { status: 400 });
  }

  // El estado se vuelve a exigir aquí (no solo en el findMany de arriba)
  // para que la escritura sea atómica (ver aprobar-lote/route.ts).
  const resultado = await db.solicitudPasaje.updateMany({
    where: { id: { in: idsValidos }, estado: "APROBADA" },
    data: { estado: "REVISADO", fechaRevision: new Date(), revisadoPorId: session.id },
  });

  return NextResponse.json({ revisadas: resultado.count });
}
