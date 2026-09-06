// app/api/dashboard/kpis/route.ts
// GET: contadores y totales de Pendientes/Aprobadas/Pagadas en un rango
// de fechas, más el gasto por Área. Respeta el alcance de TH.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { obtenerCondicionRutaTH } from "../../../../lib/alcanceTH";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "SUPER_ADMIN", "FINANZAS"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  if (!desde || !hasta) {
    return NextResponse.json({ error: "Debes indicar un rango de fechas" }, { status: 400 });
  }

  // Finanzas no tiene asignaciones por área, así que solo restringimos
  // el alcance cuando el rol es Talento Humano.
  const { sinRestriccion, condicion } =
    session.rol === "ADMIN_TH"
      ? await obtenerCondicionRutaTH(session.id, session.rol)
      : { sinRestriccion: true as const, condicion: {} as Record<string, unknown> };

  if (condicion === null) {
    return NextResponse.json({ error: "No tienes áreas asignadas" }, { status: 403 });
  }

  const base = {
    fecha: { gte: new Date(desde), lte: new Date(hasta) },
    ...(sinRestriccion ? {} : { ruta: condicion }),
  };

  const [pendientes, aprobadas, pagadas, paraGasto] = await Promise.all([
    db.solicitudPasaje.aggregate({ where: { ...base, estado: "PENDIENTE" }, _count: true, _sum: { montoTotal: true } }),
    db.solicitudPasaje.aggregate({ where: { ...base, estado: "APROBADA" }, _count: true, _sum: { montoTotal: true } }),
    db.solicitudPasaje.aggregate({ where: { ...base, estado: "PAGADA" }, _count: true, _sum: { montoTotal: true } }),
    db.solicitudPasaje.findMany({
      where: { ...base, estado: { in: ["APROBADA", "PAGADA"] } },
      include: { ruta: { include: { area: true } } },
    }),
  ]);

  const mapaGasto = new Map<string, number>();
  for (const s of paraGasto) {
    const nombre = s.ruta.area.nombre;
    mapaGasto.set(nombre, (mapaGasto.get(nombre) ?? 0) + Number(s.montoTotal));
  }
  const gastoPorArea = Array.from(mapaGasto.entries())
    .map(([area, total]) => ({ area, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return NextResponse.json({
    pendientes: { cantidad: pendientes._count, total: Number(pendientes._sum.montoTotal ?? 0) },
    aprobadas: { cantidad: aprobadas._count, total: Number(aprobadas._sum.montoTotal ?? 0) },
    pagadas: { cantidad: pagadas._count, total: Number(pagadas._sum.montoTotal ?? 0) },
    gastoPorArea,
  });
}