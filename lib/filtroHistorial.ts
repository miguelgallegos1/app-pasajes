// lib/filtroHistorial.ts
// Filtro común de los historiales (TH, Coordinación, Jefe, Nómina) para
// sus tres rutas — lista, "Por colaborador" y Excel —, que antes repetían
// el mismo bloque cada una: rango de fechas obligatorio, Empresa/Sitio/Área
// (sumados al alcance asignado, si el rol lo tiene), colaborador,
// supervisor, ruta y estado (solo entre los que ese historial muestra).

import { NextResponse } from "next/server";
import type { EstadoSolicitud, Prisma } from "../app/generated/prisma/client";
import { obtenerCondicionRutaTH } from "./alcanceTH";
import { ubicacionDesdeParams, condicionRuta } from "./filtroUbicacion";
import { fechaValida } from "./fechas";
import { SIN_SUPERVISOR } from "./sinSupervisor";
import { agregarPorColaborador } from "./agregacionColaborador";
import { ordenarColaboradores, leerPagina } from "./ordenHistorial";

export const POR_PAGINA_HISTORIAL = 15;

type Opciones = {
  // Estados que muestra este historial; el parámetro `estado` solo puede
  // elegir uno de ellos (sin él, todos).
  estados: EstadoSolicitud[];
  // Limitar a las áreas asignadas al usuario (AsignacionTH).
  conAlcance: boolean;
};

type Resultado =
  | { error: NextResponse }
  | { filtro: Prisma.SolicitudPasajeWhereInput; desde: string; hasta: string };

export async function filtroHistorial(
  session: { id: string; rol: string },
  sp: URLSearchParams,
  { estados, conAlcance }: Opciones
): Promise<Resultado> {
  const desde = sp.get("desde");
  const hasta = sp.get("hasta");
  if (!desde || !hasta) {
    return { error: NextResponse.json({ error: "Debes indicar un rango de fechas" }, { status: 400 }) };
  }
  const desdeFecha = fechaValida(desde);
  const hastaFecha = fechaValida(hasta);
  if (!desdeFecha || !hastaFecha) {
    return { error: NextResponse.json({ error: "Rango de fechas inválido" }, { status: 400 }) };
  }

  let ruta: ReturnType<typeof condicionRuta> = condicionRuta(true, null, ubicacionDesdeParams(sp));
  if (conAlcance) {
    const { sinRestriccion, condicion } = await obtenerCondicionRutaTH(session.id, session.rol);
    if (condicion === null) {
      return { error: NextResponse.json({ error: "No tienes áreas asignadas" }, { status: 403 }) };
    }
    ruta = condicionRuta(sinRestriccion, condicion, ubicacionDesdeParams(sp));
  }

  const colaboradorId = sp.get("colaboradorId");
  const supervisorId = sp.get("supervisorId");
  const rutaId = sp.get("rutaId");
  const estado = sp.get("estado") as EstadoSolicitud | null;

  const filtro: Prisma.SolicitudPasajeWhereInput = {
    fecha: { gte: desdeFecha, lte: hastaFecha },
    ...ruta,
    ...(colaboradorId ? { colaboradorId } : {}),
    ...(supervisorId === SIN_SUPERVISOR
      ? { colaborador: { supervisorId: null } }
      : supervisorId
      ? { colaborador: { supervisorId } }
      : {}),
    ...(rutaId ? { rutaId } : {}),
    estado: estado && estados.includes(estado) ? estado : estados.length === 1 ? estados[0] : { in: estados },
  };
  return { filtro, desde, hasta };
}

// Respuesta de la vista "Por colaborador": total de solicitudes + valor por
// colaborador (agregado en la base), ordenado ENTERO antes de paginar.
export async function respuestaPorColaborador(filtro: Prisma.SolicitudPasajeWhereInput, sp: URLSearchParams) {
  const pagina = leerPagina(sp);
  const todos = ordenarColaboradores(await agregarPorColaborador(filtro), sp);
  const total = todos.length;
  const visibles = todos.slice((pagina - 1) * POR_PAGINA_HISTORIAL, pagina * POR_PAGINA_HISTORIAL);
  return NextResponse.json({
    items: visibles.map((c) => ({ id: c.colaboradorId, nombre: c.nombreColaborador, cantidad: c.cantidad, total: c.total })),
    total,
    totalPaginas: Math.max(1, Math.ceil(total / POR_PAGINA_HISTORIAL)),
    pagina,
  });
}
