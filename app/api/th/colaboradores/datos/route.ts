// app/api/th/colaboradores/datos/route.ts
// Datos para la pantalla "Colaboradores" de TH: el listado completo del
// alcance más empresas/sitios/áreas para el filtro. Se pide desde el
// cliente (en vez de bloquear la navegación esperando esta consulta en el
// servidor) para que la pantalla se muestre de inmediato.

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";
import { obtenerCondicionColaboradorTH, obtenerAreasPermitidasTH } from "../../../../../lib/alcanceTH";

export async function GET() {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const [{ sinRestriccion, condicion }, areasPermitidas] = await Promise.all([
    obtenerCondicionColaboradorTH(session.id, session.rol),
    obtenerAreasPermitidasTH(session.id, session.rol),
  ]);
  const sinAsignaciones = condicion === null;

  const colaboradores = sinAsignaciones
    ? []
    : await db.colaborador.findMany({
        where: sinRestriccion ? {} : (condicion as object),
        include: {
          area: { include: { sitio: { include: { empresa: true } } } },
          supervisor: { select: { nombreCompleto: true } },
          _count: { select: { solicitudes: true } },
        },
        orderBy: { numero: "asc" },
      });

  const colaboradoresSerializados = colaboradores.map((c) => ({
    id: c.id,
    numero: c.numero,
    nombreCompleto: c.nombreCompleto,
    apellidos: c.apellidos,
    nombres: c.nombres,
    codigoNomina: c.codigoNomina,
    estado: c.estado,
    esSupervisor: c.esSupervisor,
    supervisorNombre: c.supervisor?.nombreCompleto ?? null,
    empresaId: c.area.sitio.empresa.id,
    sitioId: c.area.sitioId,
    areaId: c.areaId,
    areaLabel: `${c.area.sitio.empresa.nombre} · ${c.area.sitio.nombre} · ${c.area.nombre}`,
    tieneSolicitudes: c._count.solicitudes > 0,
  }));

  const areasSerializadas = areasPermitidas.map((a) => ({
    id: a.id,
    label: `${a.sitio.empresa.nombre} · ${a.sitio.nombre} · ${a.nombre}`,
  }));

  // Empresas, sitios y áreas únicos (derivados de las áreas permitidas)
  // para los filtros en cascada de la tabla de colaboradores.
  const empresasMapa = new Map<string, { id: string; nombre: string }>();
  const sitiosMapa = new Map<string, { id: string; nombre: string; empresaId: string }>();
  const areasMapa = new Map<string, { id: string; nombre: string; sitioId: string }>();
  for (const a of areasPermitidas) {
    empresasMapa.set(a.sitio.empresa.id, { id: a.sitio.empresa.id, nombre: a.sitio.empresa.nombre });
    sitiosMapa.set(a.sitioId, { id: a.sitioId, nombre: a.sitio.nombre, empresaId: a.sitio.empresa.id });
    areasMapa.set(a.id, { id: a.id, nombre: a.nombre, sitioId: a.sitioId });
  }

  return NextResponse.json({
    colaboradores: colaboradoresSerializados,
    areasDisponibles: areasSerializadas,
    empresas: Array.from(empresasMapa.values())
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map((e) => ({ id: e.id, label: e.nombre })),
    sitios: Array.from(sitiosMapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    areas: Array.from(areasMapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    sinAsignaciones,
  });
}
