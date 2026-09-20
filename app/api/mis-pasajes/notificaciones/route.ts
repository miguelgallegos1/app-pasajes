// app/api/mis-pasajes/notificaciones/route.ts
// Últimas solicitudes resueltas (Aprobada o Rechazada) para la campanita
// del header: las propias del colaborador y, si es supervisor, también
// las de su equipo (mismo alcance que mis-pasajes/datos) — un colaborador
// a cargo de un supervisor nunca entra a ver esto por su cuenta. Se
// limita a 15: alcanza de sobra para "qué se resolvió últimamente" y
// mantiene la consulta liviana — el historial completo está en Mis Pasajes.
//
// No-store explícito: es una consulta chica y sensible al segundo (la
// campanita depende de que esto refleje el estado más reciente apenas se
// pide), así que no conviene dejarla a criterio de ningún caché
// intermedio (navegador, CDN) por más que ya sea dinámica por usar cookies.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession, acortarNombreLibre } from "../../../../lib/auth";
import { obtenerColaboradorPorUsuarioId } from "../../../../lib/colaboradorSesion";

export const dynamic = "force-dynamic";

const SIN_CACHE = { headers: { "Cache-Control": "no-store" } };

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403, ...SIN_CACHE });

  const colaborador = await obtenerColaboradorPorUsuarioId(session.id);
  if (!colaborador) return NextResponse.json({ error: "No autorizado" }, { status: 403, ...SIN_CACHE });

  const equipo = colaborador.esSupervisor
    ? await db.colaborador.findMany({
        where: { supervisorId: colaborador.id, estado: "ACTIVO" },
        select: { id: true },
      })
    : [];
  const idsAConsultar = [colaborador.id, ...equipo.map((c) => c.id)];

  // Se trae un lote más amplio que el que se muestra (ordenado por fecha de
  // VIAJE, la única columna indexada) y se reordena abajo por fecha de
  // RESOLUCIÓN real — con "fecha" nomás, una recién aprobada con viaje
  // próximo se podía tapar detrás de otras con viaje más lejano resueltas
  // hace rato, y nunca entraba en el "top 15".
  const solicitudes = await db.solicitudPasaje.findMany({
    where: { colaboradorId: { in: idsAConsultar }, estado: { in: ["APROBADA", "RECHAZADA"] } },
    orderBy: { fecha: "desc" },
    take: 100,
    include: { ruta: { select: { nombre: true } }, colaborador: { select: { nombreCompleto: true } } },
  });
  solicitudes.sort((a, b) => {
    const fa = (a.fechaAprobacion ?? a.fechaRechazo ?? a.fechaSolicitud).getTime();
    const fb = (b.fechaAprobacion ?? b.fechaRechazo ?? b.fechaSolicitud).getTime();
    return fb - fa;
  });
  solicitudes.length = Math.min(solicitudes.length, 15);

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
      // Solo interesa mostrarlo cuando es de un miembro del equipo, no la
      // propia — el front lo omite si coincide con el colaborador logueado.
      nombreColaborador: s.colaboradorId !== colaborador.id ? s.colaborador.nombreCompleto : null,
    };
  });

  return NextResponse.json({ items }, SIN_CACHE);
}
