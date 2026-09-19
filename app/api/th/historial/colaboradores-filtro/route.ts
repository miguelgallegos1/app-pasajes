// app/api/th/historial/colaboradores-filtro/route.ts
// GET: colaboradores con al menos una solicitud Aprobada/Pagada dentro
// del alcance del TH y el rango de fechas dado — para poblar el combo
// "Colaborador" del historial sin cargar la lista completa de la empresa
// (que puede ser grande y no tiene relación con lo que se está buscando).

import { NextResponse } from "next/server";
import { getSession } from "../../../../../lib/auth";
import { obtenerCondicionRutaTH } from "../../../../../lib/alcanceTH";
import { fechaValida } from "../../../../../lib/fechas";
import { agregarPorColaborador } from "../../../../../lib/agregacionColaborador";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

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
    estado === "APROBADA" || estado === "PAGADA"
      ? { estado: estado as "APROBADA" | "PAGADA" }
      : { estado: { in: ["APROBADA", "PAGADA"] as Array<"APROBADA" | "PAGADA"> } };

  const filtro = {
    fecha: { gte: desdeFecha, lte: hastaFecha },
    ...(sinRestriccion ? {} : { ruta: condicion }),
    ...filtroEstado,
  };

  const colaboradores = await agregarPorColaborador(filtro);
  return NextResponse.json(colaboradores.map((c) => ({ id: c.colaboradorId, nombreCompleto: c.nombreColaborador })));
}
