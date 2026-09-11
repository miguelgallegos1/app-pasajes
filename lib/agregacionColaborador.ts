// lib/agregacionColaborador.ts
// Agregaciones reutilizables para las vistas "por colaborador" de
// Coordinador y Nómina: total de rutas + valor por colaborador, con
// desglose por ruta bajo demanda. Se calculan en la base de datos
// (groupBy, una fila por colaborador/ruta con actividad en el rango, no
// una por solicitud) para que la pantalla siga rindiendo bien aunque el
// historial crezca con el tiempo.

import { db } from "./db";

export type ResumenColaborador = {
  colaboradorId: string;
  nombreColaborador: string;
  cantidad: number;
  total: number;
};

export async function agregarPorColaborador(where: Record<string, unknown>): Promise<ResumenColaborador[]> {
  const grupos = await db.solicitudPasaje.groupBy({
    by: ["colaboradorId"],
    where,
    _sum: { montoTotal: true },
    _count: true,
  });
  if (grupos.length === 0) return [];

  const colaboradores = await db.colaborador.findMany({
    where: { id: { in: grupos.map((g) => g.colaboradorId) } },
    select: { id: true, nombreCompleto: true },
  });
  const nombrePorId = new Map(colaboradores.map((c) => [c.id, c.nombreCompleto]));

  return grupos
    .map((g) => ({
      colaboradorId: g.colaboradorId,
      nombreColaborador: nombrePorId.get(g.colaboradorId) ?? "Desconocido",
      cantidad: g._count,
      total: Number(g._sum.montoTotal ?? 0),
    }))
    .sort((a, b) => a.nombreColaborador.localeCompare(b.nombreColaborador));
}

export type ResumenRuta = {
  rutaId: string;
  nombreRuta: string;
  cantidad: number;
  total: number;
};

// Desglose por ruta de UN colaborador puntual (se usa al expandir su fila).
export async function agregarPorRuta(where: Record<string, unknown>, colaboradorId: string): Promise<ResumenRuta[]> {
  const grupos = await db.solicitudPasaje.groupBy({
    by: ["rutaId"],
    where: { ...where, colaboradorId },
    _sum: { montoTotal: true },
    _count: true,
  });
  if (grupos.length === 0) return [];

  const rutas = await db.ruta.findMany({
    where: { id: { in: grupos.map((g) => g.rutaId) } },
    select: { id: true, nombre: true },
  });
  const nombrePorId = new Map(rutas.map((r) => [r.id, r.nombre]));

  return grupos
    .map((g) => ({
      rutaId: g.rutaId,
      nombreRuta: nombrePorId.get(g.rutaId) ?? "Desconocida",
      cantidad: g._count,
      total: Number(g._sum.montoTotal ?? 0),
    }))
    .sort((a, b) => a.nombreRuta.localeCompare(b.nombreRuta));
}
