// app/api/th/solicitudes/datos/route.ts
// Datos para "Crear solicitud" de TH: colaboradores de su alcance, las
// rutas exclusivas de cada uno, y empresas/sitios/áreas para el filtro. Se
// pide desde el cliente (en vez de bloquear la navegación esperando esto
// en el servidor) para que la pantalla se muestre de inmediato.

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
        select: {
          id: true,
          numero: true,
          nombreCompleto: true,
          codigoNomina: true,
          estado: true,
          areaId: true,
          area: { select: { nombre: true, sitioId: true } },
        },
        orderBy: { numero: "asc" },
      });

  const empresasMapa = new Map<string, { id: string; nombre: string }>();
  const sitiosMapa = new Map<string, { id: string; nombre: string; empresaId: string }>();
  const areasMapa = new Map<string, { id: string; nombre: string; sitioId: string; empresaId: string }>();
  for (const a of areasPermitidas) {
    empresasMapa.set(a.sitio.empresa.id, { id: a.sitio.empresa.id, nombre: a.sitio.empresa.nombre });
    sitiosMapa.set(a.sitioId, { id: a.sitioId, nombre: a.sitio.nombre, empresaId: a.sitio.empresa.id });
    areasMapa.set(a.id, { id: a.id, nombre: a.nombre, sitioId: a.sitioId, empresaId: a.sitio.empresa.id });
  }
  const areaPorId = new Map(areasMapa.entries());

  const idsColaboradores = colaboradores.map((c) => c.id);

  // Las rutas exclusivas de TODOS los colaboradores del alcance se traen en
  // una sola consulta agrupada (mismo patrón que Mis Pasajes) — elegir a
  // cualquiera en la lista de la izquierda no dispara ningún pedido nuevo.
  const rutasRaw =
    idsColaboradores.length === 0
      ? []
      : await db.ruta.findMany({
          where: { activo: true, colaboradoresExclusivos: { some: { id: { in: idsColaboradores } } } },
          include: { colaboradoresExclusivos: { where: { id: { in: idsColaboradores } }, select: { id: true } } },
          orderBy: { nombre: "asc" },
        });

  const rutasPorColaborador: Record<string, { id: string; valor: number; label: string }[]> = {};
  for (const id of idsColaboradores) rutasPorColaborador[id] = [];
  for (const ruta of rutasRaw) {
    const item = { id: ruta.id, valor: Number(ruta.valor), label: ruta.nombre };
    for (const c of ruta.colaboradoresExclusivos) rutasPorColaborador[c.id]?.push(item);
  }

  const colaboradoresSerializados = colaboradores.map((c) => {
    const area = areaPorId.get(c.areaId);
    return {
      id: c.id,
      numero: c.numero,
      nombreCompleto: c.nombreCompleto,
      codigoNomina: c.codigoNomina,
      estado: c.estado,
      areaId: c.areaId,
      areaNombre: c.area.nombre,
      sitioId: c.area.sitioId,
      empresaId: area?.empresaId ?? "",
    };
  });

  return NextResponse.json({
    colaboradores: colaboradoresSerializados,
    rutasPorColaborador,
    empresas: Array.from(empresasMapa.values())
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map((e) => ({ id: e.id, label: e.nombre })),
    sitios: Array.from(sitiosMapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    areas: Array.from(areasMapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    sinAsignaciones,
  });
}
