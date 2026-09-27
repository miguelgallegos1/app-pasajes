// app/api/historial/alcance/route.ts
// GET: Empresas/Sitios/Áreas que el usuario puede consultar en los
// historiales, para los combos del buscador. Sale de la ESTRUCTURA
// asignada (no de las solicitudes de un rango de fechas): así el usuario
// elige el alcance antes de buscar, en vez de traer todo y filtrar después.
// TH y Coordinación: sus áreas asignadas (AsignacionTH); Nómina, Jefe y
// Super Admin: todas.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { obtenerAreasPermitidasTH } from "../../../../lib/alcanceTH";

const ROLES = ["ADMIN_TH", "COORDINADOR", "NOMINA", "JEFE", "SUPER_ADMIN"];

export async function GET() {
  const session = await getSession();
  if (!session || !ROLES.includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Nómina y Jefe no tienen alcance restringido: ven toda la estructura (igual que
  // Super Admin, que obtenerAreasPermitidasTH ya resuelve como "todas").
  const areas =
    session.rol === "NOMINA" || session.rol === "JEFE"
      ? await db.area.findMany({
          select: { id: true, nombre: true, sitioId: true, sitio: { select: { nombre: true, empresa: { select: { id: true, nombre: true } } } } },
          orderBy: { nombre: "asc" },
        })
      : await obtenerAreasPermitidasTH(session.id, session.rol);

  const empresas = new Map<string, { id: string; nombre: string }>();
  const sitios = new Map<string, { id: string; nombre: string; empresaId: string }>();
  for (const a of areas) {
    empresas.set(a.sitio.empresa.id, { id: a.sitio.empresa.id, nombre: a.sitio.empresa.nombre });
    sitios.set(a.sitioId, { id: a.sitioId, nombre: a.sitio.nombre, empresaId: a.sitio.empresa.id });
  }
  const porNombre = (x: { nombre: string }, y: { nombre: string }) => x.nombre.localeCompare(y.nombre);

  return NextResponse.json({
    empresas: Array.from(empresas.values()).sort(porNombre),
    sitios: Array.from(sitios.values()).sort(porNombre),
    areas: areas.map((a) => ({ id: a.id, nombre: a.nombre, sitioId: a.sitioId })),
    sinAsignaciones: areas.length === 0,
  });
}
