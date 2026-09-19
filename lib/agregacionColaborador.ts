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

export type SupervisoresConActividad = {
  supervisores: { id: string; nombre: string }[];
  haySinSupervisor: boolean;
};

// Supervisores (y si hay alguien "sin supervisor", que solicita directo
// con su propio PIN) con al menos una solicitud dentro del filtro dado —
// para poblar el combo "Supervisor" de los historiales sin cargar todos
// los supervisores de la empresa. groupBy no puede agrupar por un campo
// de una relación (colaborador.supervisorId), así que se resuelve con
// una sola consulta distinct por colaborador en vez de un groupBy.
export async function supervisoresConActividad(where: Record<string, unknown>): Promise<SupervisoresConActividad> {
  const filas = await db.solicitudPasaje.findMany({
    where,
    distinct: ["colaboradorId"],
    select: {
      colaborador: {
        select: { supervisorId: true, supervisor: { select: { nombreCompleto: true } } },
      },
    },
  });

  const vistos = new Map<string, string>();
  let haySinSupervisor = false;
  for (const f of filas) {
    if (f.colaborador.supervisorId) vistos.set(f.colaborador.supervisorId, f.colaborador.supervisor?.nombreCompleto ?? "");
    else haySinSupervisor = true;
  }

  return {
    supervisores: Array.from(vistos.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    haySinSupervisor,
  };
}
