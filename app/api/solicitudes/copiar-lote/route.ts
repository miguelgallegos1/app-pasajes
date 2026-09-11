// app/api/solicitudes/copiar-lote/route.ts
// POST: copia una o varias solicitudes existentes (de cualquier estado)
// a una fecha nueva. Cada copia nace como una solicitud PENDIENTE
// normal — mismo colaborador y ruta, con el valor de la ruta tomado de
// nuevo al momento de copiar (por si cambió desde el original) y un
// código propio. Pensado para el caso de una ruta fija que se repite
// día a día: en vez de rehacer el formulario, se elige el día de origen
// y se copian las que hagan falta al día que corresponda.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { condicionRutasVisibles } from "../../../../lib/rutas";
import { generarCodigoSolicitud } from "../../../../lib/codigoSolicitud";
import { fechaValida } from "../../../../lib/fechas";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { ids, fecha } = await req.json().catch(() => ({ ids: null, fecha: null }));
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((v) => typeof v === "string")) {
    return NextResponse.json({ error: "No se seleccionó ninguna ruta" }, { status: 400 });
  }
  if (!fecha) {
    return NextResponse.json({ error: "Debes indicar la fecha de destino" }, { status: 400 });
  }
  const fechaDestino = fechaValida(fecha);
  if (!fechaDestino) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  const miColaborador = await db.colaborador.findUnique({ where: { usuarioId: session.id } });
  if (!miColaborador) return NextResponse.json({ error: "Colaborador no encontrado" }, { status: 404 });

  const equipo = miColaborador.esSupervisor
    ? await db.colaborador.findMany({ where: { supervisorId: miColaborador.id, estado: "ACTIVO" }, select: { id: true } })
    : [];
  const idsPermitidos = new Set<string>([miColaborador.id, ...equipo.map((c) => c.id)]);

  // Solo se copian las solicitudes que sean del propio colaborador o de
  // alguien de su equipo (si es supervisor) — igual que al crear una
  // solicitud nueva a nombre de alguien más.
  const fuentes = await db.solicitudPasaje.findMany({
    where: { id: { in: ids } },
    select: { id: true, colaboradorId: true, rutaId: true },
  });
  const fuentesValidas = fuentes.filter((f) => idsPermitidos.has(f.colaboradorId));
  if (fuentesValidas.length === 0) {
    return NextResponse.json({ error: "Ninguna de las rutas elegidas es válida" }, { status: 400 });
  }

  // Trae una sola vez cada colaborador involucrado, para revalidar que la
  // ruta original le sigue correspondiendo hoy (pudo cambiar de área, o
  // la ruta pudo desactivarse desde entonces) sin una consulta por fila.
  const colaboradorPorId = new Map(
    (
      await db.colaborador.findMany({
        where: { id: { in: Array.from(new Set(fuentesValidas.map((f) => f.colaboradorId))) } },
      })
    ).map((c) => [c.id, c])
  );

  let copiadas = 0;
  for (const fuente of fuentesValidas) {
    const colaborador = colaboradorPorId.get(fuente.colaboradorId);
    if (!colaborador) continue;

    const ruta = await db.ruta.findFirst({
      where: { id: fuente.rutaId, ...condicionRutasVisibles(colaborador) },
    });
    if (!ruta) continue; // ruta ya no válida para este colaborador (desactivada, cambio de área, etc.)

    const codigo = await generarCodigoSolicitud();
    await db.solicitudPasaje.create({
      data: {
        codigo,
        colaboradorId: colaborador.id,
        rutaId: ruta.id,
        fecha: fechaDestino,
        montoTotal: ruta.valor,
        estado: "PENDIENTE",
        creadoPorUsuarioId: colaborador.id !== miColaborador.id ? session.id : null,
      },
    });
    copiadas++;
  }

  if (copiadas === 0) {
    return NextResponse.json({ error: "Ninguna de las rutas elegidas sigue siendo válida" }, { status: 400 });
  }

  return NextResponse.json({ copiadas });
}
