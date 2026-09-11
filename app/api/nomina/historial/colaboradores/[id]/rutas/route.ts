// app/api/nomina/historial/colaboradores/[id]/rutas/route.ts
// GET: desglose por ruta de UN colaborador puntual (PAGADA, mismo rango de
// fechas), para expandir su fila en la vista agrupada.

import { NextResponse } from "next/server";
import { getSession } from "../../../../../../../lib/auth";
import { fechaValida } from "../../../../../../../lib/fechas";
import { agregarPorRuta } from "../../../../../../../lib/agregacionColaborador";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !["NOMINA", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  if (!desde || !hasta) {
    return NextResponse.json({ error: "Debes indicar un rango de fechas" }, { status: 400 });
  }
  const desdeFecha = fechaValida(desde);
  const hastaFecha = fechaValida(hasta);
  if (!desdeFecha || !hastaFecha) {
    return NextResponse.json({ error: "Rango de fechas inválido" }, { status: 400 });
  }

  const rutas = await agregarPorRuta({ estado: "PAGADA", fecha: { gte: desdeFecha, lte: hastaFecha } }, id);
  return NextResponse.json(rutas.map((r) => ({ id: r.rutaId, nombre: r.nombreRuta, cantidad: r.cantidad, total: r.total })));
}
