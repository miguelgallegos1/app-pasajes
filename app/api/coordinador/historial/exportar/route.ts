// app/api/coordinador/historial/exportar/route.ts
// GET: exporta a Excel el historial (Revisadas + Pagadas) dentro del
// alcance del Coordinador, con los mismos filtros que la pantalla.

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { filtroHistorial } from "../../../../../lib/filtroHistorial";
import { getSession } from "../../../../../lib/auth";
import {
  construirLibroExcel,
  limitarFilasExportacion,
  filaHistorialExcel,
  filaAvisoTruncadoHistorial,
  nombreArchivoExcel,
} from "../../../../../lib/exportarExcel";
import { nombresDeUsuarios } from "../../../../../lib/nombresActores";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !["COORDINADOR", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const resultado = await filtroHistorial(session, searchParams, { estados: ["REVISADO", "PAGADA"], conAlcance: true });
  if ("error" in resultado) return resultado.error;
  const { filtro, desde, hasta } = resultado;

  const solicitudes = await db.solicitudPasaje.findMany({
    where: filtro,
    include: {
      colaborador: { select: { nombreCompleto: true, codigoNomina: true } },
      ruta: {
        select: {
          nombre: true,
          area: { select: { nombre: true, sitio: { select: { nombre: true, empresa: { select: { nombre: true } } } } } },
        },
      },
    },
    orderBy: { fecha: "desc" },
  });

  const nombrePorActorId = await nombresDeUsuarios(
    solicitudes.flatMap((s) => [s.aprobadoPorId, s.revisadoPorId, s.pagadoPorId])
  );
  const { filas, truncado } = limitarFilasExportacion(solicitudes.map((s) => filaHistorialExcel(s, nombrePorActorId)));
  // El tope de filas protege al servidor, pero si se aplicó hay que
  // avisarlo dentro del propio Excel (el archivo se descarga con un link
  // directo, no hay forma de mostrar un aviso en pantalla).
  if (truncado) {
    filas.push(filaAvisoTruncadoHistorial());
  }

  const libro = construirLibroExcel(filas, "Historial de revisión");
  return new NextResponse(new Uint8Array(libro), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreArchivoExcel(`historial-revision-${desde}_a_${hasta}`)}"`,
    },
  });
}
