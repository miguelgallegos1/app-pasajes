// app/api/jefe/historial/exportar/route.ts
// GET: exporta a Excel el historial completo (cualquier estado) con los
// mismos filtros que la pantalla, sin paginar (con un tope de filas).

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { filtroHistorial } from "../../../../../lib/filtroHistorial";
import { getSession } from "../../../../../lib/auth";
import { formatearFecha } from "../../../../../lib/fechas";
import { construirLibroExcel, limitarFilasExportacion, nombreArchivoExcel } from "../../../../../lib/exportarExcel";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !["JEFE", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const resultado = await filtroHistorial(session, searchParams, { estados: ["PENDIENTE", "APROBADA", "RECHAZADA", "REVISADO", "PAGADA"], conAlcance: false });
  if ("error" in resultado) return resultado.error;
  const { filtro, desde, hasta } = resultado;

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
      Empresa: s.ruta.empresa.nombre,
      Sitio: s.ruta.sitio.nombre,
      Área: s.ruta.area.nombre,
      "Código colaborador": s.colaborador.codigoNomina ?? "",
      Colaborador: s.colaborador.nombreCompleto,
      Ruta: s.ruta.nombre,
      Estado: s.estado as string,
      Fecha: formatearFecha(s.fecha),
      Valor: Number(s.montoTotal),
    }))
  );
  // El tope de filas protege al servidor, pero si se aplicó hay que
  // avisarlo dentro del propio Excel (el archivo se descarga con un link
  // directo, no hay forma de mostrar un aviso en pantalla).
  if (truncado) {
    filas.push({
      Empresa: "Exportación limitada a 5000 filas. Acorta el rango de fechas para ver el resto.",
      Sitio: "",
      Área: "",
      "Código colaborador": "",
      Colaborador: "",
      Ruta: "",
      Estado: "",
      Fecha: "",
      Valor: 0,
    });
  }

  const libro = construirLibroExcel(filas, "Historial general");
  return new NextResponse(new Uint8Array(libro), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreArchivoExcel(`historial-general-${desde}_a_${hasta}`)}"`,
    },
  });
}
