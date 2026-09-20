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
      colaborador: { select: { nombreCompleto: true, codigoNomina: true } },
      ruta: {
        select: {
          nombre: true,
          empresa: { select: { nombre: true } },
          sitio: { select: { nombre: true } },
          area: { select: { nombre: true } },
        },
      },
    },
    orderBy: { fecha: "desc" },
  });

  const { filas, truncado } = limitarFilasExportacion(
    solicitudes.map((s) => ({
      Código: s.codigo,
      Colaborador: s.colaborador.nombreCompleto,
      "Código colaborador": s.colaborador.codigoNomina ?? "",
      Empresa: s.ruta.empresa.nombre,
      Sitio: s.ruta.sitio.nombre,
      Área: s.ruta.area.nombre,
      Ruta: s.ruta.nombre,
      Estado: s.estado as string,
      "Fecha del pasaje": formatearFecha(s.fecha),
      Valor: Number(s.montoTotal),
    }))
  );
  // El tope de filas protege al servidor, pero si se aplicó hay que
  // avisarlo dentro del propio Excel (el archivo se descarga con un link
  // directo, no hay forma de mostrar un aviso en pantalla).
  if (truncado) {
    filas.push({
      Código: "Exportación limitada a 5000 filas. Acorta el rango de fechas para ver el resto.",
      Colaborador: "",
      "Código colaborador": "",
      Empresa: "",
      Sitio: "",
      Área: "",
      Ruta: "",
      Estado: "",
      "Fecha del pasaje": "",
      Valor: 0,
    });
  }

  const libro = construirLibroExcel(filas, "Historial general");
  return new NextResponse(new Uint8Array(libro), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="historial-general-${desde}_a_${hasta}.xlsx"`,
    },
  });
}
