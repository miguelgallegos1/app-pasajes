// app/api/historial/personas/route.ts
// GET ?empresaId&sitioId&areaId (todos opcionales): colaboradores y
// supervisores del alcance elegido en el buscador de los historiales, para
// los combos Supervisor y Colaborador. Dependen del ALCANCE (dónde trabaja el colaborador), no de
// las solicitudes de un rango de fechas — así se pueden elegir antes de
// buscar. Siempre dentro de las áreas permitidas del usuario.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { obtenerAreasPermitidasTH } from "../../../../lib/alcanceTH";

const ROLES = ["ADMIN_TH", "COORDINADOR", "NOMINA", "SUPER_ADMIN"];

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !ROLES.includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const empresaId = searchParams.get("empresaId");
  const sitioId = searchParams.get("sitioId");
  const areaId = searchParams.get("areaId");
  // Sin nada elegido ("Todas" las empresas): todo el alcance del usuario.
  const ubicacion = areaId ? { areaId } : sitioId ? { sitioId } : empresaId ? { sitio: { empresaId } } : {};

  // Nómina y Super Admin ven todo; TH y Coordinación, solo sus áreas.
  const restringido = session.rol === "ADMIN_TH" || session.rol === "COORDINADOR";
  const areasPermitidas = restringido ? (await obtenerAreasPermitidasTH(session.id, session.rol)).map((a) => a.id) : null;

  const colaboradores = await db.colaborador.findMany({
    where: { AND: [ubicacion, areasPermitidas ? { areaId: { in: areasPermitidas } } : {}] },
    select: { id: true, nombreCompleto: true, supervisorId: true, esSupervisor: true, estado: true },
    orderBy: { nombreCompleto: "asc" },
  });

  // Supervisores: los del alcance y también los de fuera que tengan gente
  // dentro de él (el supervisor puede estar en otra área que su equipo).
  const idsSupervisores = new Set(colaboradores.filter((c) => c.esSupervisor).map((c) => c.id));
  colaboradores.forEach((c) => c.supervisorId && idsSupervisores.add(c.supervisorId));
  const faltantes = Array.from(idsSupervisores).filter((id) => !colaboradores.some((c) => c.id === id));
  const externos = faltantes.length
    ? await db.colaborador.findMany({ where: { id: { in: faltantes } }, select: { id: true, nombreCompleto: true } })
    : [];
  const nombrePorId = new Map([...colaboradores, ...externos].map((c) => [c.id, c.nombreCompleto]));

  return NextResponse.json({
    colaboradores: colaboradores.map((c) => ({
      id: c.id,
      nombre: c.estado === "ACTIVO" ? c.nombreCompleto : `${c.nombreCompleto} (inactivo)`,
      supervisorId: c.supervisorId,
    })),
    supervisores: Array.from(idsSupervisores)
      .map((id) => ({ id, nombre: nombrePorId.get(id) ?? "" }))
      .filter((s) => s.nombre)
      .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    // Hay alguien sin supervisor (solicita directo con su propio PIN).
    haySinSupervisor: colaboradores.some((c) => !c.esSupervisor && !c.supervisorId),
  });
}
