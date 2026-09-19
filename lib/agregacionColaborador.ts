// lib/agregacionColaborador.ts
// Agregación reutilizable para las vistas "Por colaborador": total de
// solicitudes + valor por colaborador. Se calcula en la base de datos
// (groupBy, una fila por colaborador con actividad en el rango, no una
// por solicitud) para que la pantalla siga rindiendo bien aunque el
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
