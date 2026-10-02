// app/api/nomina/historial/route.ts
// GET: historial de solicitudes PAGADAS, filtrable por fecha, Empresa,
// Sitio, Área, Colaborador (en cascada, sin mezclar) y opcionalmente Ruta
// (para el desglose de la vista agrupada por colaborador). Paginado.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { filtroHistorial, POR_PAGINA_HISTORIAL } from "../../../../lib/filtroHistorial";
import { getSession } from "../../../../lib/auth";
import { ordenSolicitudes, leerPagina } from "../../../../lib/ordenHistorial";
import { nombresDeUsuarios } from "../../../../lib/nombresActores";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !["NOMINA", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const pagina = leerPagina(searchParams);
  const resultado = await filtroHistorial(session, searchParams, { estados: ["PAGADA"], conAlcance: false });
  if ("error" in resultado) return resultado.error;
  const { filtro } = resultado;

  const [items, total, suma] = await Promise.all([
    db.solicitudPasaje.findMany({
      where: filtro,
      include: {
        colaborador: { select: { nombreCompleto: true, codigoNomina: true } },
        ruta: { select: { nombre: true } },
      },
      // Ordena TODO el rango en la base (columna elegida en la tabla) y
      // recién después pagina — no solo la página visible.
      orderBy: ordenSolicitudes(searchParams, { fechaPago: "desc" }),
      skip: (pagina - 1) * POR_PAGINA_HISTORIAL,
      take: POR_PAGINA_HISTORIAL,
    }),
    db.solicitudPasaje.count({ where: filtro }),
    db.solicitudPasaje.aggregate({ where: filtro, _sum: { montoTotal: true } }),
  ]);

  const nombrePorActorId = await nombresDeUsuarios(items.map((s) => s.pagadoPorId));

  return NextResponse.json({
    items: items.map((s) => ({
      id: s.id,
      codigo: s.codigo,
      fecha: s.fecha.toISOString(),
      fechaPago: s.fechaPago?.toISOString() ?? null,
      montoTotal: Number(s.montoTotal),
      nombreColaborador: s.colaborador.nombreCompleto,
      codigoNomina: s.colaborador.codigoNomina,
      pagadoPor: s.pagadoPorId ? (nombrePorActorId.get(s.pagadoPorId) ?? null) : null,
      rutaLabel: s.ruta.nombre,
    })),
    total,
    totalPaginas: Math.max(1, Math.ceil(total / POR_PAGINA_HISTORIAL)),
    totalMonto: Number(suma._sum?.montoTotal ?? 0),
    pagina,
  });
}
