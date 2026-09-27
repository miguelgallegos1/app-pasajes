// app/api/th/historial/colaboradores/route.ts
// GET: total de rutas + valor por colaborador (Aprobadas + Pagadas) dentro
// del alcance de TH. Paginado por colaborador (vista "Por colaborador"
// del Historial de aprobaciones).

import { NextResponse } from "next/server";
import { getSession } from "../../../../../lib/auth";
import { obtenerCondicionRutaTH } from "../../../../../lib/alcanceTH";
import { ubicacionDesdeParams, condicionRuta } from "../../../../../lib/filtroUbicacion";
import { fechaValida } from "../../../../../lib/fechas";
import { agregarPorColaborador } from "../../../../../lib/agregacionColaborador";
import { ordenarColaboradores, leerPagina } from "../../../../../lib/ordenHistorial";
import { SIN_SUPERVISOR } from "../../../../../lib/sinSupervisor";

const POR_PAGINA = 15;

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  // Empresa/Sitio/Área elegidos en el buscador (se suman al alcance del usuario).
  const ubicacion = ubicacionDesdeParams(searchParams);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const estado = searchParams.get("estado");
  const supervisorId = searchParams.get("supervisorId");
  const pagina = leerPagina(searchParams);

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

  const filtro: Record<string, unknown> = {
    // Colaborador elegido en el buscador (antes esta vista lo ignoraba).
    ...(searchParams.get("colaboradorId") ? { colaboradorId: searchParams.get("colaboradorId") } : {}),
    fecha: { gte: desdeFecha, lte: hastaFecha },
    ...condicionRuta(sinRestriccion, condicion, ubicacion),
    ...(supervisorId === SIN_SUPERVISOR
      ? { colaborador: { supervisorId: null } }
      : supervisorId
      ? { colaborador: { supervisorId } }
      : {}),
    ...filtroEstado,
  };

  // Se ordena la lista COMPLETA (columna elegida en la tabla) antes de
  // paginar, no solo la página visible.
  const todos = ordenarColaboradores(await agregarPorColaborador(filtro), searchParams);
  const total = todos.length;
  const pagina_ = todos.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  return NextResponse.json({
    items: pagina_.map((c) => ({ id: c.colaboradorId, nombre: c.nombreColaborador, cantidad: c.cantidad, total: c.total })),
    total,
    totalPaginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
    pagina,
  });
}
