// app/api/th/rutas/datos/route.ts
// Datos para la pantalla "Rutas" de TH: todas las rutas de su alcance más
// empresas/sitios/áreas para el filtro. Se pide desde el cliente (en vez
// de bloquear la navegación esperando esta consulta en el servidor) para
// que la pantalla se muestre de inmediato.

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";
import { obtenerAreasPermitidasTH } from "../../../../../lib/alcanceTH";

export async function GET() {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const areasPermitidas = await obtenerAreasPermitidasTH(session.id, session.rol);
  const areaIds = areasPermitidas.map((a) => a.id);

  const rutas = areaIds.length
    ? await db.ruta.findMany({
        where: { areaId: { in: areaIds } },
        include: {
          area: { include: { sitio: { include: { empresa: true } } } },
          colaboradoresExclusivos: { select: { nombreCompleto: true }, orderBy: { nombreCompleto: "asc" } },
          _count: { select: { solicitudes: true } },
        },
        // Por defecto, las últimas creadas primero (número más alto =
        // creada más reciente). El usuario puede reordenar por columna
        // desde la tabla (useOrdenTabla), esto es solo el orden inicial.
        orderBy: { numero: "desc" },
      })
    : [];

  const rutasSerializadas = rutas.map((r) => ({
    id: r.id,
    numero: r.numero,
    nombre: r.nombre,
    valor: Number(r.valor),
    activo: r.activo,
    empresaId: r.empresaId,
    sitioId: r.sitioId,
    areaId: r.areaId,
    areaLabel: `${r.area.sitio.empresa.nombre} · ${r.area.sitio.nombre} · ${r.area.nombre}`,
    tieneSolicitudes: r._count.solicitudes > 0,
    colaboradoresExclusivosNombres: r.colaboradoresExclusivos.map((c) => c.nombreCompleto),
  }));

  const areasSerializadas = areasPermitidas.map((a) => ({
    id: a.id,
    label: `${a.sitio.empresa.nombre} · ${a.sitio.nombre} · ${a.nombre}`,
  }));

  // Empresas y sitios únicos (derivados de las áreas permitidas) para los
  // filtros en cascada de la tabla de rutas.
  const empresasMapa = new Map<string, { id: string; nombre: string }>();
  const sitiosMapa = new Map<string, { id: string; nombre: string; empresaId: string }>();
  const areasMapa = new Map<string, { id: string; nombre: string; sitioId: string }>();
  for (const a of areasPermitidas) {
    empresasMapa.set(a.sitio.empresa.id, { id: a.sitio.empresa.id, nombre: a.sitio.empresa.nombre });
    sitiosMapa.set(a.sitioId, { id: a.sitioId, nombre: a.sitio.nombre, empresaId: a.sitio.empresa.id });
    areasMapa.set(a.id, { id: a.id, nombre: a.nombre, sitioId: a.sitioId });
  }

  return NextResponse.json({
    rutas: rutasSerializadas,
    areasDisponibles: areasSerializadas,
    empresas: Array.from(empresasMapa.values())
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map((e) => ({ id: e.id, label: e.nombre })),
    sitios: Array.from(sitiosMapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    areas: Array.from(areasMapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    sinAsignaciones: areasPermitidas.length === 0,
    esSuperAdmin: session.rol === "SUPER_ADMIN",
  });
}
