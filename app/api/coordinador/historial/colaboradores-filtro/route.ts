// app/api/coordinador/historial/colaboradores-filtro/route.ts
// GET: colaboradores con al menos una solicitud Revisada/Pagada dentro
// del alcance del Coordinador y el rango de fechas dado — para poblar el
// combo "Colaborador" del historial sin cargar la lista completa.

import { NextResponse } from "next/server";
import { getSession } from "../../../../../lib/auth";
import { obtenerCondicionRutaTH } from "../../../../../lib/alcanceTH";
import { fechaValida } from "../../../../../lib/fechas";
import { agregarPorColaborador } from "../../../../../lib/agregacionColaborador";

// Debe coincidir con el mismo sentinel del combo "Supervisor" en el
// cliente — no es un id real, así que no puede chocar con uno.
const SIN_SUPERVISOR = "__sin_supervisor__";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !["COORDINADOR", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const estado = searchParams.get("estado");
  const supervisorId = searchParams.get("supervisorId");

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

  const filtro = {
    fecha: { gte: desdeFecha, lte: hastaFecha },
    ...(sinRestriccion ? {} : { ruta: condicion }),
    ...(supervisorId === SIN_SUPERVISOR
      ? { colaborador: { supervisorId: null } }
      : supervisorId
      ? { colaborador: { supervisorId } }
      : {}),
    ...filtroEstado,
  };

  const colaboradores = await agregarPorColaborador(filtro);
  return NextResponse.json(colaboradores.map((c) => ({ id: c.colaboradorId, nombreCompleto: c.nombreColaborador })));
}
