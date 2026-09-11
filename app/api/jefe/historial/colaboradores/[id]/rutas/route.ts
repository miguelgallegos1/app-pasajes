// app/api/jefe/historial/colaboradores/[id]/rutas/route.ts
// GET: desglose por ruta de UN colaborador puntual (cualquier estado, o
// el que se filtre), para expandir su fila en la vista agrupada.

import { NextResponse } from "next/server";
import { getSession } from "../../../../../../../lib/auth";
import { fechaValida } from "../../../../../../../lib/fechas";
import { agregarPorRuta } from "../../../../../../../lib/agregacionColaborador";

const ESTADOS_VALIDOS = ["PENDIENTE", "APROBADA", "RECHAZADA", "REVISADO", "PAGADA"] as const;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !["JEFE", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const estadoParam = searchParams.get("estado");

  if (!desde || !hasta) {
    return NextResponse.json({ error: "Debes indicar un rango de fechas" }, { status: 400 });
  }
  const desdeFecha = fechaValida(desde);
  const hastaFecha = fechaValida(hasta);
  if (!desdeFecha || !hastaFecha) {
    return NextResponse.json({ error: "Rango de fechas inválido" }, { status: 400 });
  }

  const filtro: Record<string, unknown> = { fecha: { gte: desdeFecha, lte: hastaFecha } };
  if (estadoParam && (ESTADOS_VALIDOS as readonly string[]).includes(estadoParam)) filtro.estado = estadoParam;

  const rutas = await agregarPorRuta(filtro, id);
  return NextResponse.json(rutas.map((r) => ({ id: r.rutaId, nombre: r.nombreRuta, cantidad: r.cantidad, total: r.total })));
}
