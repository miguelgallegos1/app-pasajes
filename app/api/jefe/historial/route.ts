// app/api/jefe/historial/route.ts
// GET: historial de TODAS las solicitudes (cualquier estado), sin
// restricción de alcance. Filtrable por fecha, Empresa/Sitio/Área/
// Colaborador (en cascada), Ruta (para el drill-down de la vista
// agrupada) y Estado. Paginado.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { fechaValida } from "../../../../lib/fechas";

const POR_PAGINA = 15;
const ESTADOS_VALIDOS = ["PENDIENTE", "APROBADA", "RECHAZADA", "REVISADO", "PAGADA"] as const;

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !["JEFE", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const empresaId = searchParams.get("empresaId");
  const sitioId = searchParams.get("sitioId");
  const areaId = searchParams.get("areaId");
  const colaboradorId = searchParams.get("colaboradorId");
  const rutaId = searchParams.get("rutaId");
  const estadoParam = searchParams.get("estado");
  const pagina = Math.max(1, Number(searchParams.get("pagina") ?? "1"));

  if (!desde || !hasta) {
    return NextResponse.json({ error: "Debes indicar un rango de fechas" }, { status: 400 });
  }
  const desdeFecha = fechaValida(desde);
  const hastaFecha = fechaValida(hasta);
  if (!desdeFecha || !hastaFecha) {
    return NextResponse.json({ error: "Rango de fechas inválido" }, { status: 400 });
  }

  const filtro: Record<string, unknown> = {
    fecha: { gte: desdeFecha, lte: hastaFecha },
  };
  if (colaboradorId) filtro.colaboradorId = colaboradorId;
  else if (areaId) filtro.ruta = { areaId };
  else if (sitioId) filtro.ruta = { sitioId };
  else if (empresaId) filtro.ruta = { empresaId };
  if (rutaId) filtro.rutaId = rutaId;
  if (estadoParam && (ESTADOS_VALIDOS as readonly string[]).includes(estadoParam)) filtro.estado = estadoParam;

  const [items, total, suma] = await Promise.all([
    db.solicitudPasaje.findMany({
      where: filtro,
      include: {
        colaborador: { select: { nombreCompleto: true } },
        ruta: { select: { nombre: true } },
      },
      orderBy: { fecha: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    db.solicitudPasaje.count({ where: filtro }),
    db.solicitudPasaje.aggregate({ where: filtro, _sum: { montoTotal: true } }),
  ]);

  return NextResponse.json({
    items: items.map((s) => ({
      id: s.id,
      codigo: s.codigo,
      fecha: s.fecha.toISOString(),
      montoTotal: Number(s.montoTotal),
      estado: s.estado,
      rutaLabel: s.ruta.nombre,
      nombreColaborador: s.colaborador.nombreCompleto,
    })),
    total,
    totalPaginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
    totalMonto: Number(suma._sum?.montoTotal ?? 0),
    pagina,
  });
}
