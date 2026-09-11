// app/api/coordinador/historial/colaboradores/[id]/rutas/route.ts
// GET: desglose por ruta de UN colaborador puntual (Revisadas + Pagadas,
// dentro del alcance del Coordinador), para expandir su fila.

import { NextResponse } from "next/server";
import { getSession } from "../../../../../../../lib/auth";
import { obtenerCondicionRutaTH } from "../../../../../../../lib/alcanceTH";
import { fechaValida } from "../../../../../../../lib/fechas";
import { agregarPorRuta } from "../../../../../../../lib/agregacionColaborador";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !["COORDINADOR", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const estado = searchParams.get("estado");

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

  const rutas = await agregarPorRuta(
    {
      fecha: { gte: desdeFecha, lte: hastaFecha },
      ...(sinRestriccion ? {} : { ruta: condicion }),
      ...filtroEstado,
    },
    id
  );
  return NextResponse.json(rutas.map((r) => ({ id: r.rutaId, nombre: r.nombreRuta, cantidad: r.cantidad, total: r.total })));
}
