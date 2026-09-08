// app/api/finanzas/historial/route.ts
// GET: historial de solicitudes PAGADAS, filtrable por fecha, Empresa,
// Sitio, Área y Colaborador (en cascada, sin mezclar). Paginado.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";

const POR_PAGINA = 15;

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !["FINANZAS", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const empresaId = searchParams.get("empresaId");
  const sitioId = searchParams.get("sitioId");
  const areaId = searchParams.get("areaId");
  const colaboradorId = searchParams.get("colaboradorId");
  const pagina = Math.max(1, Number(searchParams.get("pagina") ?? "1"));

  if (!desde || !hasta) {
    return NextResponse.json({ error: "Debes indicar un rango de fechas" }, { status: 400 });
  }

  const filtro: Record<string, unknown> = {
    estado: "PAGADA",
    fecha: { gte: new Date(desde), lte: new Date(hasta) },
  };
  if (colaboradorId) filtro.colaboradorId = colaboradorId;
  else if (areaId) filtro.ruta = { areaId };
  else if (sitioId) filtro.ruta = { sitioId };
  else if (empresaId) filtro.ruta = { empresaId };

  const [items, total, suma] = await Promise.all([
    db.solicitudPasaje.findMany({
      where: filtro,
      include: {
        colaborador: { select: { nombreCompleto: true } },
        ruta: { select: { nombre: true } },
      },
      orderBy: { fechaPago: "desc" },
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
      fechaPago: s.fechaPago?.toISOString() ?? null,
      montoTotal: Number(s.montoTotal),
      nombreColaborador: s.colaborador.nombreCompleto,
      rutaLabel: s.ruta.nombre,
    })),
    total,
    totalPaginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
    totalMonto: Number(suma._sum?.montoTotal ?? 0),
    pagina,
  });
}