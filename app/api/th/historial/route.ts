// app/api/th/historial/route.ts
// GET: historial de Aprobadas/Revisadas/Pagadas dentro del alcance del TH,
// filtrable por fecha, Empresa/Sitio/Área, estado, supervisor y
// colaborador. Paginado y ordenado en el servidor.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { filtroHistorial, POR_PAGINA_HISTORIAL } from "../../../../lib/filtroHistorial";
import { getSession } from "../../../../lib/auth";
import { ordenSolicitudes, leerPagina } from "../../../../lib/ordenHistorial";
import { nombresDeUsuarios } from "../../../../lib/nombresActores";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const pagina = leerPagina(searchParams);
  const resultado = await filtroHistorial(session, searchParams, { estados: ["APROBADA", "REVISADO", "PAGADA"], conAlcance: true });
  if ("error" in resultado) return resultado.error;
  const { filtro } = resultado;

  // Lo que imprime "Imprimir pagadas" (app/th/historial/imprimir): los
  // MISMOS filtros de la búsqueda pero siempre solo PAGADAS (sin importar
  // el filtro de Estado) — para habilitar el botón solo cuando la
  // constancia no va a salir vacía.
  const filtroImprimir = { ...filtro, estado: "PAGADA" as const };

  const [items, total, suma, pagadasImprimibles] = await Promise.all([
    db.solicitudPasaje.findMany({
      where: filtro,
      include: { ruta: { select: { nombre: true } }, colaborador: { select: { nombreCompleto: true, codigoNomina: true } } },
      // Ordena TODO el rango en la base (columna elegida en la tabla) y
      // recién después pagina — no solo la página visible.
      orderBy: ordenSolicitudes(searchParams, { fecha: "desc" }),
      skip: (pagina - 1) * POR_PAGINA_HISTORIAL,
      take: POR_PAGINA_HISTORIAL,
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
    totalPaginas: Math.max(1, Math.ceil(total / POR_PAGINA_HISTORIAL)),
    totalMonto: Number(suma._sum?.montoTotal ?? 0),
    pagadasImprimibles,
    pagina,
  });
}