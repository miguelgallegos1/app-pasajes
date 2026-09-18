// app/api/rutas/equipo/route.ts
// GET: rutas visibles para TODO el equipo de quien pide (uno mismo, y si
// es supervisor también cada colaborador a su cargo), en una sola
// consulta agrupada por colaborador. Reemplaza pedir /api/rutas una vez
// por colaborador al abrir "Nueva solicitud" — con equipos de 100+
// personas eso eran 100+ round-trips; esto es uno solo.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const miColaborador = await db.colaborador.findUnique({ where: { usuarioId: session.id } });
  if (!miColaborador || miColaborador.estado !== "ACTIVO") {
    return NextResponse.json({ error: "Colaborador no encontrado" }, { status: 404 });
  }

  const equipo = miColaborador.esSupervisor
    ? await db.colaborador.findMany({ where: { supervisorId: miColaborador.id, estado: "ACTIVO" }, select: { id: true } })
    : [];
  const idsEquipo = [miColaborador.id, ...equipo.map((c) => c.id)];

  const rutas = await db.ruta.findMany({
    where: { activo: true, colaboradoresExclusivos: { some: { id: { in: idsEquipo } } } },
    include: { colaboradoresExclusivos: { where: { id: { in: idsEquipo } }, select: { id: true } } },
    orderBy: { nombre: "asc" },
  });

  const rutasPorColaborador: Record<string, { id: string; valor: number; label: string }[]> = {};
  for (const id of idsEquipo) rutasPorColaborador[id] = [];
  for (const ruta of rutas) {
    const item = { id: ruta.id, valor: Number(ruta.valor), label: ruta.nombre };
    for (const c of ruta.colaboradoresExclusivos) {
      rutasPorColaborador[c.id]?.push(item);
    }
  }

  return NextResponse.json(rutasPorColaborador);
}
