// app/api/solicitudes/pagar-lote/route.ts
// POST: marca VARIAS solicitudes revisadas como pagadas de una vez.

import { NextResponse, after } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { notificarCambioEstadoLote } from "../../../../lib/webPush";

// Debe coincidir con TANDA_PAGO en components/PanelNomina.tsx.
const MAX_POR_LOTE = 500;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !["NOMINA", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { ids } = await req.json().catch(() => ({ ids: null }));
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((v) => typeof v === "string")) {
    return NextResponse.json({ error: "No se enviaron solicitudes" }, { status: 400 });
  }
  // Tope por petición para que un bloque enorme no deje a la base
  // ocupada: la pantalla parte selecciones más grandes en tandas.
  if (ids.length > MAX_POR_LOTE) {
    return NextResponse.json({ error: `Máximo ${MAX_POR_LOTE} solicitudes por bloque` }, { status: 400 });
  }

  // Una sola escritura atómica: el WHERE exige estado REVISADO, así que si
  // alguna cambió de estado (otra persona la devolvió, o ya estaba pagada)
  // simplemente no se toca. Devuelve exactamente cuáles se pagaron, para
  // que la pantalla quite solo esas y avise de las que no.
  const pagadas = await db.solicitudPasaje.updateManyAndReturn({
    where: { id: { in: ids }, estado: "REVISADO" },
    data: { estado: "PAGADA", fechaPago: new Date(), pagadoPorId: session.id },
    select: { id: true, colaboradorId: true, estado: true },
  });

  if (pagadas.length === 0) {
    return NextResponse.json({ error: "Ninguna de las solicitudes es válida para pagar" }, { status: 400 });
  }

  after(() => notificarCambioEstadoLote(pagadas, session.id));

  return NextResponse.json({ pagadas: pagadas.length, ids: pagadas.map((s) => s.id) });
}
