// app/api/solicitudes/historial/route.ts
// GET: historial de solicitudes APROBADAS y/o PAGADAS, filtrado por fecha
// y opcionalmente por estado.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { ordenSolicitudes } from "../../../../lib/ordenHistorial";
import { fechaValida } from "../../../../lib/fechas";

const POR_PAGINA = 15;

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const estado = searchParams.get("estado");
  const colaboradorIdParam = searchParams.get("colaboradorId");
  const pagina = Math.max(1, Number(searchParams.get("pagina") ?? "1"));

  if (!desde || !hasta) {
    return NextResponse.json({ error: "Debes indicar un rango de fechas" }, { status: 400 });
  }
  const desdeFecha = fechaValida(desde);
  const hastaFecha = fechaValida(hasta);
  if (!desdeFecha || !hastaFecha) {
    return NextResponse.json({ error: "Rango de fechas inválido" }, { status: 400 });
  }

  const miColaborador = await db.colaborador.findUnique({ where: { usuarioId: session.id } });
  if (!miColaborador) return NextResponse.json({ error: "Colaborador no encontrado" }, { status: 404 });

  // Sin colaboradorId: si es supervisor ve su historial + el de su equipo;
  // si no, solo el propio. Con colaboradorId puntual, debe ser él mismo o
  // alguien a su cargo.
  let colaboradorIds: string[];
  if (colaboradorIdParam && colaboradorIdParam !== miColaborador.id) {
    const objetivo = await db.colaborador.findUnique({ where: { id: colaboradorIdParam } });
    const esSuSupervisor = miColaborador.esSupervisor && objetivo?.supervisorId === miColaborador.id;
    if (!objetivo || !esSuSupervisor) {
      return NextResponse.json({ error: "No tienes permiso para ver el historial de ese colaborador" }, { status: 403 });
    }
    colaboradorIds = [objetivo.id];
  } else if (colaboradorIdParam === miColaborador.id || !miColaborador.esSupervisor) {
    colaboradorIds = [miColaborador.id];
  } else {
    const equipo = await db.colaborador.findMany({
      where: { supervisorId: miColaborador.id },
      select: { id: true },
    });
    colaboradorIds = [miColaborador.id, ...equipo.map((c) => c.id)];
  }

  const filtroEstado =
    estado === "APROBADA" || estado === "PAGADA"
      ? { estado: estado as "APROBADA" | "PAGADA" }
      : { estado: { in: ["APROBADA", "PAGADA"] as Array<"APROBADA" | "PAGADA"> } };

  const filtro = {
    colaboradorId: { in: colaboradorIds },
    fecha: { gte: desdeFecha, lte: hastaFecha },
    ...filtroEstado,
  };

  const [items, total, suma] = await Promise.all([
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
  ]);

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
    })),
    total,
    totalPaginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
    totalMonto: Number(suma._sum?.montoTotal ?? 0),
    pagina,
  });
}