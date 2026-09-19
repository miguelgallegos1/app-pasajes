// app/api/nomina/historial/colaboradores-filtro/route.ts
// GET: colaboradores con al menos una solicitud PAGADA dentro del rango
// de fechas y filtros (Empresa/Sitio/Área, en cascada) dados — para
// poblar el combo "Colaborador" del historial sin cargar la lista
// completa de la empresa.

import { NextResponse } from "next/server";
import { getSession } from "../../../../../lib/auth";
import { fechaValida } from "../../../../../lib/fechas";
import { agregarPorColaborador } from "../../../../../lib/agregacionColaborador";

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

  const colaboradores = await agregarPorColaborador(filtro);
  return NextResponse.json(colaboradores.map((c) => ({ id: c.colaboradorId, nombreCompleto: c.nombreColaborador })));
}
