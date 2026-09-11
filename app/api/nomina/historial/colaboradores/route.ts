// app/api/nomina/historial/colaboradores/route.ts
// GET: total de rutas + valor por colaborador (PAGADA) dentro del rango y
// filtros de la cascada Empresa/Sitio/Área. Paginado por colaborador
// (no por solicitud) — la agregación se hace en la base de datos.

import { NextResponse } from "next/server";
import { getSession } from "../../../../../lib/auth";
import { fechaValida } from "../../../../../lib/fechas";
import { agregarPorColaborador } from "../../../../../lib/agregacionColaborador";

const POR_PAGINA = 10;

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !["NOMINA", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const empresaId = searchParams.get("empresaId");
  const sitioId = searchParams.get("sitioId");
  const areaId = searchParams.get("areaId");
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
    estado: "PAGADA",
    fecha: { gte: desdeFecha, lte: hastaFecha },
  };
  if (areaId) filtro.ruta = { areaId };
  else if (sitioId) filtro.ruta = { sitioId };
  else if (empresaId) filtro.ruta = { empresaId };

  const todos = await agregarPorColaborador(filtro);
  const total = todos.length;
  const pagina_ = todos.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  return NextResponse.json({
    items: pagina_.map((c) => ({ id: c.colaboradorId, nombre: c.nombreColaborador, cantidad: c.cantidad, total: c.total })),
    total,
    totalPaginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
    pagina,
  });
}
