// app/api/solicitudes/revertir-lote/route.ts
// POST: TH o Coordinación retroceden VARIAS solicitudes APROBADAs de
// vuelta a PENDIENTE a la vez (ver [id]/revertir/route.ts). El motivo solo
// se valida y no se guarda, así que a diferencia de rechazar-lote esto sí
// puede resolverse con un único updateMany.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { obtenerCondicionRutaTH } from "../../../../lib/alcanceTH";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "COORDINADOR", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { ids, motivo } = await req.json().catch(() => ({ ids: null, motivo: "" }));
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((v) => typeof v === "string")) {
    return NextResponse.json({ error: "No se enviaron solicitudes" }, { status: 400 });
  }
  if (!motivo || motivo.trim().length < 3) {
    return NextResponse.json({ error: "Indica el motivo de la corrección" }, { status: 400 });
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
    return NextResponse.json({ error: "Ninguna de las solicitudes es válida para revertir" }, { status: 400 });
  }

  const resultado = await db.solicitudPasaje.updateMany({
    where: { id: { in: idsValidos }, estado: "APROBADA" },
    data: { estado: "PENDIENTE", fechaAprobacion: null, aprobadoPorId: null },
  });

  // No se notifica al colaborador (ver [id]/revertir/route.ts) — TH ya ve
  // esto solo, reflejado en su propia campanita de pendientes de aprobar.
  return NextResponse.json({ revertidas: resultado.count });
}
