// app/api/coordinador/historial/exportar/route.ts
// GET: exporta a Excel el historial (Revisadas + Pagadas) dentro del
// alcance del Coordinador, con los mismos filtros que la pantalla.

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";
import { obtenerCondicionRutaTH } from "../../../../../lib/alcanceTH";
import { fechaValida, formatearFecha } from "../../../../../lib/fechas";
import { construirLibroExcel, limitarFilasExportacion } from "../../../../../lib/exportarExcel";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !["COORDINADOR", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const estado = searchParams.get("estado");
  const colaboradorId = searchParams.get("colaboradorId");

  if (!desde || !hasta) {
    return NextResponse.json({ error: "Debes indicar un rango de fechas" }, { status: 400 });
  }
  const desdeFecha = fechaValida(desde);
  const hastaFecha = fechaValida(hasta);
  if (!desdeFecha || !hastaFecha) {
    return NextResponse.json({ error: "Rango de fechas inválido" }, { status: 400 });
  }

  const { sinRestriccion, condicion } = await obtenerCondicionRutaTH(session.id, session.rol);
  if (condicion === null) {
    return NextResponse.json({ error: "No tienes áreas asignadas" }, { status: 403 });
  }

  const filtroEstado =
    estado === "REVISADO" || estado === "PAGADA"
      ? { estado: estado as "REVISADO" | "PAGADA" }
      : { estado: { in: ["REVISADO", "PAGADA"] as Array<"REVISADO" | "PAGADA"> } };

  const filtro = {
    fecha: { gte: desdeFecha, lte: hastaFecha },
    ...(sinRestriccion ? {} : { ruta: condicion }),
    ...(colaboradorId ? { colaboradorId } : {}),
    ...filtroEstado,
  };

  const solicitudes = await db.solicitudPasaje.findMany({
    where: filtro,
    include: {
      colaborador: { select: { nombreCompleto: true } },
      ruta: { select: { nombre: true } },
    },
    orderBy: { fecha: "desc" },
  });

  const { filas, truncado } = limitarFilasExportacion(
    solicitudes.map((s) => ({
      Código: s.codigo,
      Colaborador: s.colaborador.nombreCompleto,
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
      Ruta: "",
      Estado: "",
      "Fecha del pasaje": "",
      Valor: 0,
    });
  }

  const libro = construirLibroExcel(filas, "Historial de revisión");
  return new NextResponse(new Uint8Array(libro), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="historial-revision-${desde}_a_${hasta}.xlsx"`,
    },
  });
}
