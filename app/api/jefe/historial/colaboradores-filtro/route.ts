// app/api/jefe/historial/colaboradores-filtro/route.ts
// GET: colaboradores con al menos una solicitud dentro del rango de
// fechas y filtros (Empresa/Sitio/Área en cascada, Estado) dados — para
// poblar el combo "Colaborador" del historial sin cargar la lista
// completa de la empresa.

import { NextResponse } from "next/server";
import { getSession } from "../../../../../lib/auth";
import { fechaValida } from "../../../../../lib/fechas";
import { agregarPorColaborador } from "../../../../../lib/agregacionColaborador";

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
  const estadoParam = searchParams.get("estado");

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
  if (areaId) filtro.ruta = { areaId };
  else if (sitioId) filtro.ruta = { sitioId };
  else if (empresaId) filtro.ruta = { empresaId };
  if (estadoParam && (ESTADOS_VALIDOS as readonly string[]).includes(estadoParam)) filtro.estado = estadoParam;

  const colaboradores = await agregarPorColaborador(filtro);
  return NextResponse.json(colaboradores.map((c) => ({ id: c.colaboradorId, nombreCompleto: c.nombreColaborador })));
}
