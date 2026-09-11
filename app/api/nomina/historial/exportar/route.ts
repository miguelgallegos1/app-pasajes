// app/api/nomina/historial/exportar/route.ts
// GET: exporta a Excel el historial de PAGADAS con los mismos filtros que
// la pantalla (desde, hasta, empresa/sitio/área/colaborador), sin paginar
// (con un tope de filas para proteger el servidor).

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";
import { fechaValida, formatearFecha } from "../../../../../lib/fechas";
import { construirLibroExcel, limitarFilasExportacion } from "../../../../../lib/exportarExcel";

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
  const colaboradorId = searchParams.get("colaboradorId");

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
  if (colaboradorId) filtro.colaboradorId = colaboradorId;
  else if (areaId) filtro.ruta = { areaId };
  else if (sitioId) filtro.ruta = { sitioId };
  else if (empresaId) filtro.ruta = { empresaId };

  const solicitudes = await db.solicitudPasaje.findMany({
    where: filtro,
    include: {
      colaborador: { select: { nombreCompleto: true } },
      ruta: { select: { nombre: true } },
    },
    orderBy: { fechaPago: "desc" },
  });

  const { filas } = limitarFilasExportacion(
    solicitudes.map((s) => ({
      Código: s.codigo,
      Colaborador: s.colaborador.nombreCompleto,
      Ruta: s.ruta.nombre,
      "Fecha del pasaje": formatearFecha(s.fecha),
      "Fecha de pago": s.fechaPago ? formatearFecha(s.fechaPago) : "",
      Valor: Number(s.montoTotal),
    }))
  );

  const libro = construirLibroExcel(filas, "Historial de pagos");
  return new NextResponse(new Uint8Array(libro), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="historial-pagos-${desde}_a_${hasta}.xlsx"`,
    },
  });
}
