// app/api/solicitudes/pagar-lote/route.ts
// POST: marca VARIAS solicitudes aprobadas como pagadas de una vez.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !["FINANZAS", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { ids } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No se enviaron solicitudes" }, { status: 400 });
  }

  const validas = await db.solicitudPasaje.findMany({
    where: { id: { in: ids }, estado: "APROBADA" },
    select: { id: true },
  });
  const idsValidos = validas.map((s) => s.id);

  if (idsValidos.length === 0) {
    return NextResponse.json({ error: "Ninguna de las solicitudes es válida para pagar" }, { status: 400 });
  }

  await db.solicitudPasaje.updateMany({
    where: { id: { in: idsValidos } },
    data: { estado: "PAGADA", fechaPago: new Date(), pagadoPorId: session.id },
  });

  return NextResponse.json({ pagadas: idsValidos.length });
}