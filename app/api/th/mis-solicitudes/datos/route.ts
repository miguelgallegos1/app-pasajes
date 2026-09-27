// app/api/th/mis-solicitudes/datos/route.ts
// Datos de "Mis solicitudes -> Registrar" para Talento Humano, con la MISMA
// forma que /api/mis-pasajes/datos (la pantalla es la del colaborador en
// modo "th", components/PanelColaborador.tsx):
// - "yo": su ficha de colaborador vinculada en Admin -> Usuarios (si no
//   tiene, colaboradorId vacío).
// - equipo + rutas: los colaboradores ACTIVOS de sus áreas, para registrar
//   por contingencia (misma consulta agrupada que usaba la pantalla
//   anterior de TH, sin costo extra).
// - solicitudes: lo que ÉL registró, solo Pendientes y Rechazadas
//   (aprobadas/revisadas/pagadas van a su Historial).

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getSession, obtenerFichaPropiaId } from "../../../../../lib/auth";
import { obtenerCondicionColaboradorTH } from "../../../../../lib/alcanceTH";

export async function GET() {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const [usuario, fichaId, { sinRestriccion, condicion }] = await Promise.all([
    db.usuario.findUnique({ where: { id: session.id }, select: { nombre: true } }),
    // Solo si la ficha es de una empresa de su alcance (ver obtenerFichaPropiaId).
    obtenerFichaPropiaId(session),
    obtenerCondicionColaboradorTH(session.id, session.rol),
  ]);
  const ficha = fichaId
    ? await db.colaborador.findUnique({ where: { id: fichaId }, select: { id: true, nombreCompleto: true } })
    : null;

  const enAlcance = condicion === null
    ? []
    : await db.colaborador.findMany({
        where: { estado: "ACTIVO", ...(sinRestriccion ? {} : (condicion as object)) },
        select: { id: true, nombreCompleto: true },
        orderBy: { nombreCompleto: "asc" },
      });
  // La propia ficha va como "yo" (de su empresa, aunque sea de otra área).
  const equipo = enAlcance.filter((c) => c.id !== ficha?.id);
  const idsConRutas = [...(ficha ? [ficha.id] : []), ...equipo.map((c) => c.id)];

  const [solicitudes, rutasRaw] = await Promise.all([
    db.solicitudPasaje.findMany({
      where: { creadoPorUsuarioId: session.id, estado: { in: ["PENDIENTE", "RECHAZADA"] } },
      orderBy: { fecha: "desc" },
      include: {
        ruta: { select: { nombre: true } },
        colaborador: { select: { nombreCompleto: true, codigoNomina: true } },
      },
    }),
    idsConRutas.length === 0
      ? Promise.resolve([])
      : db.ruta.findMany({
          where: { activo: true, colaboradoresExclusivos: { some: { id: { in: idsConRutas } } } },
          include: { colaboradoresExclusivos: { where: { id: { in: idsConRutas } }, select: { id: true } } },
          orderBy: { nombre: "asc" },
        }),
  ]);

  const rutasEquipo: Record<string, { id: string; valor: number; label: string }[]> = {};
  for (const id of idsConRutas) rutasEquipo[id] = [];
  for (const ruta of rutasRaw) {
    const item = { id: ruta.id, valor: Number(ruta.valor), label: ruta.nombre };
    for (const c of ruta.colaboradoresExclusivos) rutasEquipo[c.id]?.push(item);
  }

  return NextResponse.json({
    colaboradorId: ficha?.id ?? "",
    nombreCompleto: ficha?.nombreCompleto ?? usuario?.nombre ?? "",
    // Siempre con "equipo": puede registrar para cualquiera de sus áreas.
    esSupervisor: true,
    equipo,
    rutasEquipo,
    solicitudes: solicitudes.map((s) => ({
      id: s.id,
      codigo: s.codigo,
      colaboradorId: s.colaboradorId,
      rutaId: s.rutaId,
      fecha: s.fecha.toISOString(),
      fechaSolicitud: s.fechaSolicitud.toISOString(),
      montoTotal: Number(s.montoTotal),
      estado: s.estado,
      observaciones: s.observaciones,
      rutaLabel: s.ruta.nombre,
      nombreColaborador: s.colaborador.nombreCompleto,
      codigoNomina: s.colaborador.codigoNomina,
    })),
  });
}
