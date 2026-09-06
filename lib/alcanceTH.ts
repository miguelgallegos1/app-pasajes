// lib/alcanceTH.ts
// Calcula qué Empresa/Sitio/Área puede ver y administrar un usuario de TH,
// según sus filas en AsignacionTH. Se reutiliza en aprobaciones, historial
// y en el CRUD de colaboradores.

import { db } from "./db";

async function obtenerAsignaciones(usuarioId: string, rol: string) {
  if (rol === "SUPER_ADMIN") return { sinRestriccion: true as const, asignaciones: [] };
  const asignaciones = await db.asignacionTH.findMany({ where: { usuarioId } });
  return { sinRestriccion: false as const, asignaciones };
}

export async function obtenerCondicionRutaTH(usuarioId: string, rol: string) {
  const { sinRestriccion, asignaciones } = await obtenerAsignaciones(usuarioId, rol);
  if (sinRestriccion) return { sinRestriccion: true as const, condicion: {} as Record<string, unknown> };
  if (asignaciones.length === 0) return { sinRestriccion: false as const, condicion: null };

  const condiciones = asignaciones.map((a) => {
    if (a.areaId) return { areaId: a.areaId };
    if (a.sitioId) return { sitioId: a.sitioId };
    return { empresaId: a.empresaId! };
  });
  return { sinRestriccion: false as const, condicion: { OR: condiciones } };
}

export async function obtenerCondicionColaboradorTH(usuarioId: string, rol: string) {
  const { sinRestriccion, asignaciones } = await obtenerAsignaciones(usuarioId, rol);
  if (sinRestriccion) return { sinRestriccion: true as const, condicion: {} as Record<string, unknown> };
  if (asignaciones.length === 0) return { sinRestriccion: false as const, condicion: null };

  const condiciones = asignaciones.map((a) => {
    if (a.areaId) return { areaId: a.areaId };
    if (a.sitioId) return { sitioId: a.sitioId };
    return { sitio: { empresaId: a.empresaId! } };
  });
  return { sinRestriccion: false as const, condicion: { OR: condiciones } };
}

// Forma exacta de los datos que necesitamos de cada Área permitida.
// Usar "select" (en vez de "include") nos deja declarar este tipo con
// precisión, evitando el error de TypeScript sobre la propiedad "sitio".
type AreaPermitida = {
  id: string;
  nombre: string;
  sitioId: string;
  sitio: { nombre: string; empresa: { nombre: string } };
};

const SELECT_AREA_PERMITIDA = {
  id: true,
  nombre: true,
  sitioId: true,
  sitio: { select: { nombre: true, empresa: { select: { nombre: true } } } },
} as const;

export async function obtenerAreasPermitidasTH(usuarioId: string, rol: string): Promise<AreaPermitida[]> {
  if (rol === "SUPER_ADMIN") {
    return db.area.findMany({
      select: SELECT_AREA_PERMITIDA,
      orderBy: { nombre: "asc" },
    });
  }

  const asignaciones = await db.asignacionTH.findMany({ where: { usuarioId } });
  if (asignaciones.length === 0) return [];

  const vistas = new Set<string>();
  const resultado: AreaPermitida[] = [];

  for (const a of asignaciones) {
    let areas: AreaPermitida[];
    if (a.areaId) {
      areas = await db.area.findMany({ where: { id: a.areaId }, select: SELECT_AREA_PERMITIDA });
    } else if (a.sitioId) {
      areas = await db.area.findMany({ where: { sitioId: a.sitioId }, select: SELECT_AREA_PERMITIDA });
    } else {
      areas = await db.area.findMany({
        where: { sitio: { empresaId: a.empresaId! } },
        select: SELECT_AREA_PERMITIDA,
      });
    }
    for (const ar of areas) {
      if (!vistas.has(ar.id)) {
        vistas.add(ar.id);
        resultado.push(ar);
      }
    }
  }
  return resultado;
}