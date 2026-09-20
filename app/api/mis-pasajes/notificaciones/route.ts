// app/api/mis-pasajes/notificaciones/route.ts
// Últimas solicitudes PROPIAS del colaborador que ya quedaron resueltas
// (Aprobada o Rechazada), para la campanita del header. Se limita a 15:
// alcanza de sobra para "qué me resolvieron últimamente" y mantiene la
// consulta liviana — el colaborador ve el historial completo en Mis Pasajes.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession, acortarNombreLibre } from "../../../../lib/auth";
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

  // aprobadoPorId/rechazadoPorId no tienen relación declarada hacia
  // Usuario (son solo el id) — se resuelven los nombres en un segundo
  // paso, con un único IN en vez de una consulta por fila.
  const idsActores = Array.from(
    new Set(solicitudes.map((s) => s.aprobadoPorId ?? s.rechazadoPorId).filter((v): v is string => !!v))
  );
  const actores = idsActores.length
    ? await db.usuario.findMany({ where: { id: { in: idsActores } }, select: { id: true, nombre: true } })
    : [];
  const nombrePorActorId = new Map(actores.map((u) => [u.id, acortarNombreLibre(u.nombre)]));

  const items = solicitudes.map((s) => {
    const actorId = s.aprobadoPorId ?? s.rechazadoPorId;
    return {
      id: s.id,
      codigo: s.codigo,
      estado: s.estado as "APROBADA" | "RECHAZADA",
      rutaLabel: s.ruta.nombre,
      fecha: s.fecha.toISOString(),
      quien: actorId ? (nombrePorActorId.get(actorId) ?? null) : null,
    };
  });

  return NextResponse.json({ items });
}
