// app/api/coordinador/historial/exportar/route.ts
// GET: exporta a Excel el historial (Revisadas + Pagadas) dentro del
// alcance del Coordinador, con los mismos filtros que la pantalla.

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";
import { obtenerCondicionRutaTH } from "../../../../../lib/alcanceTH";
import { fechaValida } from "../../../../../lib/fechas";
import {
  construirLibroExcel,
  limitarFilasExportacion,
  filaHistorialExcel,
  filaAvisoTruncadoHistorial,
  nombreArchivoExcel,
} from "../../../../../lib/exportarExcel";
import { nombresDeUsuarios } from "../../../../../lib/nombresActores";

// Debe coincidir con el mismo sentinel del combo "Supervisor" en el
// cliente — no es un id real, así que no puede chocar con uno.
const SIN_SUPERVISOR = "__sin_supervisor__";

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
  const supervisorId = searchParams.get("supervisorId");

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
    ...(supervisorId === SIN_SUPERVISOR
      ? { colaborador: { supervisorId: null } }
      : supervisorId
      ? { colaborador: { supervisorId } }
      : {}),
    ...filtroEstado,
  };

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
