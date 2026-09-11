// app/api/coordinador/historial/colaboradores/route.ts
// GET: total de rutas + valor por colaborador (Revisadas + Pagadas) dentro
// del alcance del Coordinador. Paginado por colaborador.

import { NextResponse } from "next/server";
import { getSession } from "../../../../../lib/auth";
import { obtenerCondicionRutaTH } from "../../../../../lib/alcanceTH";
import { fechaValida } from "../../../../../lib/fechas";
import { agregarPorColaborador } from "../../../../../lib/agregacionColaborador";

const POR_PAGINA = 10;

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !["COORDINADOR", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const estado = searchParams.get("estado");
  const pagina = Math.max(1, Number(searchParams.get("pagina") ?? "1"));

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

  const filtro: Record<string, unknown> = {
    fecha: { gte: desdeFecha, lte: hastaFecha },
    ...(sinRestriccion ? {} : { ruta: condicion }),
    ...filtroEstado,
  };

  const todos = await agregarPorColaborador(filtro);
  const total = todos.length;
  const pagina_ = todos.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  return NextResponse.json({
    items: pagina_.map((c) => ({ id: c.colaboradorId, nombre: c.nombreColaborador, cantidad: c.cantidad, total: c.total })),
    total,
    totalPaginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
    pagina,
  });
}
