// app/api/th/historial/route.ts
// GET: historial de Aprobadas/Pagadas dentro del alcance del TH,
// filtrable por fecha, estado y colaborador. Paginado.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { ordenSolicitudes } from "../../../../lib/ordenHistorial";
import { nombresDeUsuarios } from "../../../../lib/nombresActores";
import { obtenerCondicionRutaTH } from "../../../../lib/alcanceTH";
import { fechaValida } from "../../../../lib/fechas";

const POR_PAGINA = 15;

// Debe coincidir con el mismo sentinel del combo "Supervisor" en el
// cliente — no es un id real, así que no puede chocar con uno.
const SIN_SUPERVISOR = "__sin_supervisor__";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const estado = searchParams.get("estado");
  const colaboradorId = searchParams.get("colaboradorId");
  const supervisorId = searchParams.get("supervisorId");
  const pagina = Math.max(1, Number(searchParams.get("pagina") ?? "1"));

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
    estado === "APROBADA" || estado === "PAGADA"
      ? { estado: estado as "APROBADA" | "PAGADA" }
      : { estado: { in: ["APROBADA", "PAGADA"] as Array<"APROBADA" | "PAGADA"> } };

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

  // Lo que imprime "Imprimir pagadas" (app/th/historial/imprimir): solo
  // PAGADAS del rango (y del colaborador), sin el filtro de estado ni el
  // de supervisor de la pantalla — mismo criterio, para habilitar el
  // botón solo cuando la constancia no va a salir vacía.
  const filtroImprimir = {
    estado: "PAGADA" as const,
    fecha: { gte: desdeFecha, lte: hastaFecha },
    ...(sinRestriccion ? {} : { ruta: condicion }),
    ...(colaboradorId ? { colaboradorId } : {}),
  };

  const [items, total, suma, pagadasImprimibles] = await Promise.all([
    db.solicitudPasaje.findMany({
      where: filtro,
      include: { ruta: { select: { nombre: true } }, colaborador: { select: { nombreCompleto: true, codigoNomina: true } } },
      // Ordena TODO el rango en la base (columna elegida en la tabla) y
      // recién después pagina — no solo la página visible.
      orderBy: ordenSolicitudes(searchParams, { fecha: "desc" }),
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    db.solicitudPasaje.count({ where: filtro }),
    db.solicitudPasaje.aggregate({ where: filtro, _sum: { montoTotal: true } }),
    db.solicitudPasaje.count({ where: filtroImprimir }),
  ]);

  const nombrePorActorId = await nombresDeUsuarios(items.map((s) => s.aprobadoPorId));

  return NextResponse.json({
    items: items.map((s) => ({
      id: s.id,
      codigo: s.codigo,
      fecha: s.fecha.toISOString(),
      montoTotal: Number(s.montoTotal),
      estado: s.estado,
      rutaLabel: s.ruta.nombre,
      nombreColaborador: s.colaborador.nombreCompleto,
      codigoNomina: s.colaborador.codigoNomina,
      aprobadoPor: s.aprobadoPorId ? (nombrePorActorId.get(s.aprobadoPorId) ?? null) : null,
    })),
    total,
    totalPaginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
    totalMonto: Number(suma._sum?.montoTotal ?? 0),
    pagadasImprimibles,
    pagina,
  });
}