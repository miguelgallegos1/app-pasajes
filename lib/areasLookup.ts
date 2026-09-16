// lib/areasLookup.ts
// Resuelve nombres de Empresa/Sitio/Área (como los escribe alguien en un
// Excel) al Área real de la base de datos. Se usa en la carga masiva de
// colaboradores y rutas para no obligar a nadie a escribir IDs.

import { db } from "./db";

export type AreaConHierarquia = { id: string; nombre: string; sitioId: string; empresaId: string };

export function clavearArea(empresa: string, sitio: string, area: string): string {
  return `${empresa.trim().toLowerCase()}||${sitio.trim().toLowerCase()}||${area.trim().toLowerCase()}`;
}

export async function construirMapaAreas(): Promise<Map<string, AreaConHierarquia>> {
  const areas = await db.area.findMany({
    select: {
      id: true,
      nombre: true,
      sitioId: true,
      sitio: { select: { nombre: true, empresaId: true, empresa: { select: { nombre: true } } } },
    },
  });

  const mapa = new Map<string, AreaConHierarquia>();
  for (const a of areas) {
    const clave = clavearArea(a.sitio.empresa.nombre, a.sitio.nombre, a.nombre);
    mapa.set(clave, { id: a.id, nombre: a.nombre, sitioId: a.sitioId, empresaId: a.sitio.empresaId });
  }
  return mapa;
}

// Filas para la hoja de referencia de las plantillas: los nombres EXACTOS
// que hay que copiar en las columnas Empresa/Sitio/Área.
export async function obtenerFilasReferenciaAreas(): Promise<Record<string, unknown>[]> {
  const areas = await db.area.findMany({
    select: {
      nombre: true,
      sitio: { select: { nombre: true, empresa: { select: { nombre: true } } } },
    },
    orderBy: [{ sitio: { empresa: { nombre: "asc" } } }, { sitio: { nombre: "asc" } }, { nombre: "asc" }],
  });
  return areas.map((a) => ({ Empresa: a.sitio.empresa.nombre, Sitio: a.sitio.nombre, Área: a.nombre }));
}
