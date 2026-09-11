// app/api/solicitudes/pagar-lote/route.ts
// POST: marca VARIAS solicitudes revisadas como pagadas de una vez.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !["NOMINA", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { ids } = await req.json().catch(() => ({ ids: null }));
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((v) => typeof v === "string")) {
    return NextResponse.json({ error: "No se enviaron solicitudes" }, { status: 400 });
  }

  const validas = await db.solicitudPasaje.findMany({
    where: { id: { in: ids }, estado: "REVISADO" },
    select: { id: true },
  });
  const idsValidos = validas.map((s) => s.id);

  if (idsValidos.length === 0) {
    return NextResponse.json({ error: "Ninguna de las solicitudes es válida para pagar" }, { status: 400 });
  }

  // El estado se vuelve a exigir aquí (no solo en el findMany de arriba)
  // para que la escritura sea atómica: si alguna de estas solicitudes
  // cambió de estado entre el findMany y este updateMany (por otra
  // petición concurrente), esa fila ya no calza en el WHERE y no se toca.
  const resultado = await db.solicitudPasaje.updateMany({
    where: { id: { in: idsValidos }, estado: "REVISADO" },
    data: { estado: "PAGADA", fechaPago: new Date(), pagadoPorId: session.id },
  });

  return NextResponse.json({ pagadas: resultado.count });
}