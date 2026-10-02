// app/api/jefe/historial/route.ts
// GET: historial de TODAS las solicitudes (cualquier estado), sin
// restricción de alcance. Filtrable por fecha, Empresa/Sitio/Área/
// Colaborador (en cascada), Ruta (para el drill-down de la vista
// agrupada) y Estado. Paginado.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { filtroHistorial, POR_PAGINA_HISTORIAL } from "../../../../lib/filtroHistorial";
import { getSession } from "../../../../lib/auth";
import { ordenSolicitudes, leerPagina } from "../../../../lib/ordenHistorial";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !["JEFE", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const pagina = leerPagina(searchParams);
  const resultado = await filtroHistorial(session, searchParams, { estados: ["PENDIENTE", "APROBADA", "RECHAZADA", "REVISADO", "PAGADA"], conAlcance: false });
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
      orderBy: ordenSolicitudes(searchParams, { fecha: "desc" }),
      skip: (pagina - 1) * POR_PAGINA_HISTORIAL,
      take: POR_PAGINA_HISTORIAL,
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
    totalPaginas: Math.max(1, Math.ceil(total / POR_PAGINA_HISTORIAL)),
    totalMonto: Number(suma._sum?.montoTotal ?? 0),
    pagina,
  });
}
