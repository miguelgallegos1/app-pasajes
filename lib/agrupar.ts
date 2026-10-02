// lib/agrupar.ts
// Derivados en el cliente de las colas de acción (Aprobación, Revisión,
// Pagos), que ya están completas en memoria: opciones de filtro sin
// repetir y la agrupación de la vista "Por colaborador".

import type { FilaColaborador } from "../components/TablaColaboradores";

// Opciones {id, label} únicas a partir de las filas (ej. las empresas que
// aparecen en la cola), en el orden en que aparecen.
export function opcionesUnicas<T>(items: T[], idKey: keyof T, labelKey: keyof T) {
  const vistos = new Map<string, string>();
  for (const item of items) {
    const id = String(item[idKey]);
    if (!vistos.has(id)) vistos.set(id, String(item[labelKey]));
  }
  return Array.from(vistos.entries()).map(([id, label]) => ({ id, label }));
}

type FilaConColaborador = { colaboradorId: string; nombreColaborador: string; montoTotal: number };

// Un grupo por colaborador (sus filas) y la fila resumen de cada uno
// (cantidad y total), ordenada por nombre.
export function agruparPorColaborador<T extends FilaConColaborador>(items: T[]) {
  const grupos = new Map<string, { nombre: string; items: T[] }>();
  for (const item of items) {
    if (!grupos.has(item.colaboradorId)) grupos.set(item.colaboradorId, { nombre: item.nombreColaborador, items: [] });
    grupos.get(item.colaboradorId)!.items.push(item);
  }
  const filas: FilaColaborador[] = Array.from(grupos.entries())
    .map(([id, g]) => ({
      id,
      nombre: g.nombre,
      cantidad: g.items.length,
      total: g.items.reduce((acc, i) => acc + i.montoTotal, 0),
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  const itemsDe = (colaboradorId: string) => grupos.get(colaboradorId)?.items ?? [];
  return { filas, itemsDe };
}
