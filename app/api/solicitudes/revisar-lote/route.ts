// app/api/solicitudes/revisar-lote/route.ts
// POST: marca VARIAS solicitudes aprobadas como revisadas a la vez. Solo
// revisa las que realmente estén APROBADA y dentro del alcance del
// Coordinador que las pide (ignora silenciosamente cualquier id fuera de
// su alcance, igual que aprobar-lote).

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
  if (!session || !["COORDINADOR", "SUPER_ADMIN"].includes(session.rol)) {
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
  const revisadas = await db.solicitudPasaje.updateManyAndReturn({
    where: {
      id: { in: ids },
      estado: "APROBADA",
      ...(sinRestriccion ? {} : { ruta: condicion }),
    },
    data: { estado: "REVISADO", fechaRevision: new Date(), revisadoPorId: session.id },
    select: { id: true, colaboradorId: true, estado: true },
  });

  if (revisadas.length === 0) {
    return NextResponse.json({ error: "Ninguna de las solicitudes es válida para revisar" }, { status: 400 });
  }

  after(() => notificarCambioEstadoLote(revisadas, session.id));

  return NextResponse.json({ revisadas: revisadas.length, ids: revisadas.map((s) => s.id) });
}
