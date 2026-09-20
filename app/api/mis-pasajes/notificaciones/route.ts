// app/api/mis-pasajes/notificaciones/route.ts
// Últimas solicitudes PROPIAS del colaborador que ya quedaron resueltas
// (Aprobada o Rechazada), para la campanita del header. Se limita a 15:
// alcanza de sobra para "qué me resolvieron últimamente" y mantiene la
// consulta liviana — el colaborador ve el historial completo en Mis Pasajes.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { obtenerColaboradorPorUsuarioId } from "../../../../lib/colaboradorSesion";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const colaborador = await obtenerColaboradorPorUsuarioId(session.id);
  if (!colaborador) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const solicitudes = await db.solicitudPasaje.findMany({
    where: { colaboradorId: colaborador.id, estado: { in: ["APROBADA", "RECHAZADA"] } },
    orderBy: { fecha: "desc" },
    take: 15,
    include: { ruta: { select: { nombre: true } } },
  });

  const items = solicitudes.map((s) => ({
    id: s.id,
    codigo: s.codigo,
    estado: s.estado as "APROBADA" | "RECHAZADA",
    rutaLabel: s.ruta.nombre,
    fecha: s.fecha.toISOString(),
  }));

  return NextResponse.json({ items });
}
