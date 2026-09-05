// app/api/solicitudes/historial/route.ts
// GET: historial de solicitudes ya PAGADAS, filtrado por rango de fechas.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  if (!desde || !hasta) {
    return NextResponse.json(
      { error: "Debes indicar un rango de fechas (desde y hasta)" },
      { status: 400 }
    );
  }

  const miColaborador = await db.colaborador.findUnique({
    where: { usuarioId: session.id },
  });
  if (!miColaborador) {
    return NextResponse.json({ error: "Colaborador no encontrado" }, { status: 404 });
  }

  const solicitudes = await db.solicitudPasaje.findMany({
    where: {
      colaboradorId: miColaborador.id,
      estado: "PAGADA",
      fecha: { gte: new Date(desde), lte: new Date(hasta) },
    },
    include: { ruta: { include: { area: true } } },
    orderBy: { fecha: "desc" },
    take: 200,
  });

  return NextResponse.json(solicitudes);
}