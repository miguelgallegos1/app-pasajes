// app/api/admin/solicitudes/route.ts
// GET: listado paginado de TODAS las solicitudes (cualquier estado), solo
// para Super Admin. Se puede filtrar por código, estado, colaborador y
// rango de fechas, pero ninguno es obligatorio — a diferencia de los
// historiales de TH/Coordinador/Nómina, esta pantalla está pensada para poder
// buscar una solicitud puntual por su código sin tener que acotar fechas
// primero.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { fechaValida } from "../../../../lib/fechas";

const POR_PAGINA = 20;
const ESTADOS_VALIDOS = ["PENDIENTE", "APROBADA", "RECHAZADA", "PAGADA"] as const;

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const codigo = searchParams.get("codigo")?.trim().toUpperCase();
  const estadoParam = searchParams.get("estado");
  const colaboradorId = searchParams.get("colaboradorId");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const pagina = Math.max(1, Number(searchParams.get("pagina") ?? "1"));

  const filtro: Record<string, unknown> = {};
  if (codigo) filtro.codigo = { contains: codigo };
  if (estadoParam && (ESTADOS_VALIDOS as readonly string[]).includes(estadoParam)) filtro.estado = estadoParam;
  if (colaboradorId) filtro.colaboradorId = colaboradorId;
  if (desde || hasta) {
    const desdeFecha = desde ? fechaValida(desde) : null;
    const hastaFecha = hasta ? fechaValida(hasta) : null;
    if ((desde && !desdeFecha) || (hasta && !hastaFecha)) {
      return NextResponse.json({ error: "Rango de fechas inválido" }, { status: 400 });
    }
    filtro.fecha = {
      ...(desdeFecha ? { gte: desdeFecha } : {}),
      ...(hastaFecha ? { lte: hastaFecha } : {}),
    };
  }

  const [items, total] = await Promise.all([
    db.solicitudPasaje.findMany({
      where: filtro,
      include: {
        colaborador: { select: { nombreCompleto: true } },
        ruta: { select: { nombre: true } },
      },
      orderBy: { fecha: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    db.solicitudPasaje.count({ where: filtro }),
  ]);

  return NextResponse.json({
    items: items.map((s) => ({
      id: s.id,
      codigo: s.codigo,
      fecha: s.fecha.toISOString(),
      montoTotal: Number(s.montoTotal),
      estado: s.estado,
      nombreColaborador: s.colaborador.nombreCompleto,
      rutaLabel: s.ruta.nombre,
    })),
    total,
    totalPaginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
    pagina,
  });
}
