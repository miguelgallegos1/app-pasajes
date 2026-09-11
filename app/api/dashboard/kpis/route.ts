// app/api/dashboard/kpis/route.ts
// GET: contadores y totales de Pendientes/Aprobadas/Pagadas en un rango
// de fechas, más el gasto por Área. Respeta el alcance de TH.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { obtenerCondicionRutaTH } from "../../../../lib/alcanceTH";
import { fechaValida } from "../../../../lib/fechas";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "COORDINADOR", "NOMINA", "JEFE", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  if (!desde || !hasta) {
    return NextResponse.json({ error: "Debes indicar un rango de fechas" }, { status: 400 });
  }
  const desdeFecha = fechaValida(desde);
  const hastaFecha = fechaValida(hasta);
  if (!desdeFecha || !hastaFecha) {
    return NextResponse.json({ error: "Rango de fechas inválido" }, { status: 400 });
  }

  // Nómina no tiene asignaciones por área, así que solo restringimos el
  // alcance cuando el rol es Talento Humano o Coordinador.
  const { sinRestriccion, condicion } =
    session.rol === "ADMIN_TH" || session.rol === "COORDINADOR"
      ? await obtenerCondicionRutaTH(session.id, session.rol)
      : { sinRestriccion: true as const, condicion: {} as Record<string, unknown> };

  if (condicion === null) {
    return NextResponse.json({ error: "No tienes áreas asignadas" }, { status: 403 });
  }

  const base = {
    fecha: { gte: desdeFecha, lte: hastaFecha },
    ...(sinRestriccion ? {} : { ruta: condicion }),
  };

  const [pendientes, aprobadas, revisadas, pagadas, gastoPorRuta] = await Promise.all([
    db.solicitudPasaje.aggregate({ where: { ...base, estado: "PENDIENTE" }, _count: true, _sum: { montoTotal: true } }),
    db.solicitudPasaje.aggregate({ where: { ...base, estado: "APROBADA" }, _count: true, _sum: { montoTotal: true } }),
    db.solicitudPasaje.aggregate({ where: { ...base, estado: "REVISADO" }, _count: true, _sum: { montoTotal: true } }),
    db.solicitudPasaje.aggregate({ where: { ...base, estado: "PAGADA" }, _count: true, _sum: { montoTotal: true } }),
    // Se agrupa por rutaId en la base de datos (en vez de traer cada
    // solicitud completa con su ruta/área para sumarlas en memoria); el
    // número de rutas distintas es muchísimo menor que el de solicitudes.
    db.solicitudPasaje.groupBy({
      by: ["rutaId"],
      where: { ...base, estado: { in: ["APROBADA", "REVISADO", "PAGADA"] } },
      _sum: { montoTotal: true },
    }),
  ]);

  const rutaIds = gastoPorRuta.map((g) => g.rutaId);
  const rutas = rutaIds.length
    ? await db.ruta.findMany({
        where: { id: { in: rutaIds } },
        select: { id: true, area: { select: { nombre: true } } },
      })
    : [];
  const areaPorRuta = new Map(rutas.map((r) => [r.id, r.area.nombre]));

  const mapaGasto = new Map<string, number>();
  for (const g of gastoPorRuta) {
    const nombre = areaPorRuta.get(g.rutaId) ?? "Desconocida";
    mapaGasto.set(nombre, (mapaGasto.get(nombre) ?? 0) + Number(g._sum.montoTotal ?? 0));
  }
  // Top 4 áreas con nombre propio + el resto agrupado en "Otras" (nunca
  // más de 5 porciones en el gráfico de pastel, y nunca un color nuevo
  // generado sobre la marcha para una 5ª+ área).
  const TOP_AREAS = 4;
  const entradasGasto = Array.from(mapaGasto.entries())
    .map(([area, total]) => ({ area, total }))
    .sort((a, b) => b.total - a.total);
  const restoGasto = entradasGasto.slice(TOP_AREAS).reduce((acc, e) => acc + e.total, 0);
  const gastoPorArea = [
    ...entradasGasto.slice(0, TOP_AREAS),
    ...(restoGasto > 0 ? [{ area: "Otras", total: restoGasto }] : []),
  ];

  // Tendencia de los últimos 6 meses (hasta el mes de "hasta"), para el
  // gráfico de barras comparativo — independiente del rango de fechas
  // elegido arriba, así siempre se puede ver la evolución reciente.
  const MESES_TENDENCIA = 6;
  const NOMBRES_MES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const rangosMensuales = Array.from({ length: MESES_TENDENCIA }, (_, i) => {
    const offset = MESES_TENDENCIA - 1 - i;
    const inicio = new Date(Date.UTC(hastaFecha.getUTCFullYear(), hastaFecha.getUTCMonth() - offset, 1));
    const fin = new Date(Date.UTC(hastaFecha.getUTCFullYear(), hastaFecha.getUTCMonth() - offset + 1, 0, 23, 59, 59, 999));
    return { inicio, fin };
  });

  const tendenciaMensual = await Promise.all(
    rangosMensuales.map(async ({ inicio, fin }) => {
      const grupos = await db.solicitudPasaje.groupBy({
        by: ["estado"],
        where: {
          fecha: { gte: inicio, lte: fin },
          ...(sinRestriccion ? {} : { ruta: condicion }),
        },
        _count: true,
      });
      const porEstado = Object.fromEntries(grupos.map((g) => [g.estado, g._count]));
      return {
        mes: `${inicio.getUTCFullYear()}-${String(inicio.getUTCMonth() + 1).padStart(2, "0")}`,
        etiqueta: `${NOMBRES_MES[inicio.getUTCMonth()]} ${inicio.getUTCFullYear()}`,
        pendientes: porEstado.PENDIENTE ?? 0,
        aprobadas: porEstado.APROBADA ?? 0,
        revisadas: porEstado.REVISADO ?? 0,
        pagadas: porEstado.PAGADA ?? 0,
      };
    })
  );

  return NextResponse.json({
    pendientes: { cantidad: pendientes._count, total: Number(pendientes._sum.montoTotal ?? 0) },
    aprobadas: { cantidad: aprobadas._count, total: Number(aprobadas._sum.montoTotal ?? 0) },
    revisadas: { cantidad: revisadas._count, total: Number(revisadas._sum.montoTotal ?? 0) },
    pagadas: { cantidad: pagadas._count, total: Number(pagadas._sum.montoTotal ?? 0) },
    gastoPorArea,
    tendenciaMensual,
  });
}