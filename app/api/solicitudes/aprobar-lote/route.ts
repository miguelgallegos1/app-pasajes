// app/api/solicitudes/aprobar-lote/route.ts
// POST: aprueba VARIAS solicitudes a la vez. Solo aprueba las que
// realmente estén PENDIENTE y dentro del alcance del TH que las pide
// (por seguridad, ignora silenciosamente cualquier id fuera de su alcance).

import { NextResponse, after } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { obtenerCondicionRutaTH } from "../../../../lib/alcanceTH";
import { notificarCambioEstadoLote } from "../../../../lib/webPush";

// Tope por petición: la pantalla parte selecciones más grandes en tandas
// (ver lib/enviarEnTandas.ts), así un bloque enorme no deja a la base ocupada.
const MAX_POR_LOTE = 500;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { ids } = await req.json().catch(() => ({ ids: null }));
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((v) => typeof v === "string")) {
    return NextResponse.json({ error: "No se enviaron solicitudes" }, { status: 400 });
  }
  if (ids.length > MAX_POR_LOTE) {
    return NextResponse.json({ error: `Máximo ${MAX_POR_LOTE} solicitudes por bloque` }, { status: 400 });
  }

  const { sinRestriccion, condicion } = await obtenerCondicionRutaTH(session.id, session.rol);
  if (condicion === null) {
    return NextResponse.json({ error: "No tienes áreas asignadas" }, { status: 403 });
  }

  // Una sola escritura atómica: el WHERE exige el estado y el alcance, así
  // que cualquier id que cambió de estado o está fuera del alcance
  // simplemente no se toca. Devuelve exactamente cuáles se procesaron,
  // para que la pantalla quite solo esas y avise de las que no.
  const aprobadas = await db.solicitudPasaje.updateManyAndReturn({
    where: {
      id: { in: ids },
      estado: "PENDIENTE",
      ...(sinRestriccion ? {} : { ruta: condicion }),
    },
    data: { estado: "APROBADA", fechaAprobacion: new Date(), aprobadoPorId: session.id },
    select: { id: true, colaboradorId: true, estado: true },
  });

  if (aprobadas.length === 0) {
    return NextResponse.json({ error: "Ninguna de las solicitudes es válida para aprobar" }, { status: 400 });
  }

  after(() => notificarCambioEstadoLote(aprobadas, session.id));

  return NextResponse.json({ aprobadas: aprobadas.length, ids: aprobadas.map((s) => s.id) });
}
