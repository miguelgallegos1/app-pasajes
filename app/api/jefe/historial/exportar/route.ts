// app/api/jefe/historial/exportar/route.ts
// GET: exporta a Excel el historial completo (cualquier estado) con los
// mismos filtros que la pantalla, sin paginar (con un tope de filas).

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";
import { fechaValida, formatearFecha } from "../../../../../lib/fechas";
import { construirLibroExcel, limitarFilasExportacion } from "../../../../../lib/exportarExcel";

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
  if (colaboradorId) filtro.colaboradorId = colaboradorId;
  else if (areaId) filtro.ruta = { areaId };
  else if (sitioId) filtro.ruta = { sitioId };
  else if (empresaId) filtro.ruta = { empresaId };
  if (estadoParam && (ESTADOS_VALIDOS as readonly string[]).includes(estadoParam)) filtro.estado = estadoParam;

  const solicitudes = await db.solicitudPasaje.findMany({
    where: filtro,
    include: {
      colaborador: { select: { nombreCompleto: true } },
      ruta: { select: { nombre: true } },
    },
    orderBy: { fecha: "desc" },
  });

  const { filas } = limitarFilasExportacion(
    solicitudes.map((s) => ({
      Código: s.codigo,
      Colaborador: s.colaborador.nombreCompleto,
      Ruta: s.ruta.nombre,
      Estado: s.estado,
      "Fecha del pasaje": formatearFecha(s.fecha),
      Valor: Number(s.montoTotal),
    }))
  );

  const libro = construirLibroExcel(filas, "Historial general");
  return new NextResponse(new Uint8Array(libro), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="historial-general-${desde}_a_${hasta}.xlsx"`,
    },
  });
}
