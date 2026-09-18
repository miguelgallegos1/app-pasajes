// app/api/solicitudes/crear-lote/route.ts
// POST: crea varias solicitudes a la vez para UNA SOLA fecha — uno o más
// colaboradores, cada uno con una o más rutas. Pensado para que un
// supervisor registre a todo su equipo (o varias rutas de una persona) sin
// repetir el formulario solicitud por solicitud. Misma validación que la
// creación individual (app/api/solicitudes/route.ts), aplicada por cada
// combinación colaborador+ruta.
//
// Un usuario de TH (o Super Admin) puede además crear para CUALQUIER
// colaborador dentro de su alcance de Empresa/Sitio/Área (ver
// lib/alcanceTH.ts) — no hace falta ser su supervisor directo. TH no
// necesariamente tiene un Colaborador propio vinculado (la mayoría no lo
// tiene), así que a diferencia de un colaborador/supervisor normal, no es
// obligatorio para poder crear a nombre de otros.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { condicionRutasVisibles } from "../../../../lib/rutas";
import { obtenerCondicionColaboradorTH } from "../../../../lib/alcanceTH";
import { generarCodigoSolicitud } from "../../../../lib/codigoSolicitud";
import { fechaValida } from "../../../../lib/fechas";

const MAX_ITEMS = 100;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { fecha, items } = await req.json().catch(() => ({}));

  if (!fecha) {
    return NextResponse.json({ error: "La fecha es obligatoria" }, { status: 400 });
  }
  const fechaSolicitud = fechaValida(fecha);
  if (!fechaSolicitud) {
    return NextResponse.json({ error: "La fecha indicada no es válida" }, { status: 400 });
  }

  // La observación es por ruta, no una sola compartida para todo el lote:
  // cada colaborador puede tener un motivo distinto por cada pasaje.
  const itemsValidos: { colaboradorId: string; rutaId: string; observaciones: string | null }[] = Array.isArray(items)
    ? items
        .filter(
          (it): it is { colaboradorId: string; rutaId: string; observaciones?: unknown } =>
            it && typeof it.colaboradorId === "string" && typeof it.rutaId === "string"
        )
        .map((it) => ({
          colaboradorId: it.colaboradorId,
          rutaId: it.rutaId,
          observaciones: typeof it.observaciones === "string" && it.observaciones.trim() ? it.observaciones.trim().toUpperCase() : null,
        }))
    : [];
  if (itemsValidos.length === 0) {
    return NextResponse.json({ error: "Selecciona al menos una ruta" }, { status: 400 });
  }
  if (itemsValidos.length > MAX_ITEMS) {
    return NextResponse.json({ error: `No se pueden crear más de ${MAX_ITEMS} solicitudes de una vez` }, { status: 400 });
  }

  const esTH = session.rol === "ADMIN_TH" || session.rol === "SUPER_ADMIN";

  // Un colaborador/supervisor normal SIEMPRE necesita su propio Colaborador
  // para poder pedir algo (así sea para sí mismo). TH no: la mayoría no
  // tiene uno vinculado, y aun así puede crear a nombre de otros dentro de
  // su alcance — solo no podría marcarse "a sí mismo" sin uno.
  const miColaborador = await db.colaborador.findUnique({ where: { usuarioId: session.id } });
  if (!esTH && (!miColaborador || miColaborador.estado !== "ACTIVO")) {
    return NextResponse.json({ error: "Colaborador no encontrado" }, { status: 404 });
  }

  const idsColaboradores = Array.from(new Set(itemsValidos.map((it) => it.colaboradorId)));
  const colaboradorPorId = new Map(
    (await db.colaborador.findMany({ where: { id: { in: idsColaboradores } } })).map((c) => [c.id, c])
  );

  // Quiénes de los pedidos caen dentro del alcance de Empresa/Sitio/Área de
  // este TH — una sola consulta extra en vez de una por colaborador.
  let idsEnAlcanceTH = new Set<string>();
  if (esTH) {
    const { sinRestriccion, condicion } = await obtenerCondicionColaboradorTH(session.id, session.rol);
    if (sinRestriccion || condicion) {
      const enAlcance = await db.colaborador.findMany({
        where: { id: { in: idsColaboradores }, ...(sinRestriccion ? {} : (condicion as object)) },
        select: { id: true },
      });
      idsEnAlcanceTH = new Set(enAlcance.map((c) => c.id));
    }
  }

  let creadas = 0;
  let ultimoError = "No se pudo crear ninguna solicitud";

  for (const colaboradorId of idsColaboradores) {
    const colaborador = colaboradorPorId.get(colaboradorId);
    const esUnoMismo = !!miColaborador && colaboradorId === miColaborador.id;
    // Mismo chequeo que la creación individual: uno mismo, alguien del
    // propio equipo si quien pide es supervisor, o cualquiera dentro del
    // alcance de Empresa/Sitio/Área si quien pide es TH.
    const esSuEquipo = !!miColaborador?.esSupervisor && colaborador?.supervisorId === miColaborador.id;
    const esAlcanceTH = idsEnAlcanceTH.has(colaboradorId);

    if (!colaborador || colaborador.estado !== "ACTIVO" || !(esUnoMismo || esSuEquipo || esAlcanceTH)) {
      ultimoError = "No puedes crear solicitudes para uno de los colaboradores elegidos";
      continue;
    }

    const itemsDeEsteColaborador = itemsValidos.filter((it) => it.colaboradorId === colaboradorId);

    // La ruta elegida DEBE seguir siendo visible para ese colaborador (misma
    // regla que al crear una sola solicitud) — se resuelve una sola vez por
    // colaborador, no por cada ruta.
    const rutasValidas = await db.ruta.findMany({
      where: { id: { in: itemsDeEsteColaborador.map((it) => it.rutaId) }, ...condicionRutasVisibles(colaborador) },
    });
    const rutaPorId = new Map(rutasValidas.map((r) => [r.id, r]));

    for (const item of itemsDeEsteColaborador) {
      const ruta = rutaPorId.get(item.rutaId);
      if (!ruta) {
        ultimoError = `Una ruta elegida ya no es válida para ${colaborador.nombreCompleto}`;
        continue;
      }

      const codigo = await generarCodigoSolicitud();
      await db.solicitudPasaje.create({
        data: {
          codigo,
          colaboradorId: colaborador.id,
          rutaId: ruta.id,
          fecha: fechaSolicitud,
          montoTotal: ruta.valor,
          observaciones: item.observaciones,
          estado: "PENDIENTE",
          creadoPorUsuarioId: !esUnoMismo ? session.id : null,
        },
      });
      creadas++;
    }
  }

  if (creadas === 0) {
    return NextResponse.json({ error: ultimoError }, { status: 400 });
  }

  return NextResponse.json({ creadas, omitidas: itemsValidos.length - creadas });
}
