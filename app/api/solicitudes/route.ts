// app/api/solicitudes/route.ts
// POST: crea una solicitud de UN SOLO DÍA. Si el usuario es Supervisor,
// puede crearla en nombre de alguien de su equipo (colaboradorId).

import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { getSession } from "../../../lib/auth";
import { condicionRutasVisibles } from "../../../lib/rutas";


export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { colaboradorId, rutaId, fecha, observaciones } = await req.json();

  if (!rutaId || !fecha) {
    return NextResponse.json(
      { error: "Faltan datos: ruta y fecha son obligatorios" },
      { status: 400 }
    );
  }

  const miColaborador = await db.colaborador.findUnique({
    where: { usuarioId: session.id },
  });
  if (!miColaborador) {
    return NextResponse.json({ error: "Colaborador no encontrado" }, { status: 404 });
  }

  // Determinar el colaborador BENEFICIARIO de la solicitud
  let colaboradorObjetivo = miColaborador;
  let creadaPorSupervisor = false;

  if (colaboradorId && colaboradorId !== miColaborador.id) {
    const colaboradorSolicitado = await db.colaborador.findUnique({
      where: { id: colaboradorId },
    });

    const esSuSupervisor =
      miColaborador.esSupervisor &&
      colaboradorSolicitado?.supervisorId === miColaborador.id;

    if (!colaboradorSolicitado || !esSuSupervisor) {
      return NextResponse.json(
        { error: "No puedes crear solicitudes para ese colaborador" },
        { status: 403 }
      );
    }
    colaboradorObjetivo = colaboradorSolicitado;
    creadaPorSupervisor = true;
  }

  // La ruta elegida DEBE pertenecer al mismo sitio+área del colaborador
  // objetivo (evita que, manipulando la petición, alguien asigne una
  // ruta de otra área).
  const ruta = await db.ruta.findFirst({
    where: { id: rutaId, ...condicionRutasVisibles(colaboradorObjetivo) },
  });

  if (!ruta) {
    return NextResponse.json(
      { error: "Esa ruta no es válida para este colaborador" },
      { status: 400 }
    );
  }

  // --- Restricción de fecha (dejada lista pero flexible) ---
  // Regla pedida: por defecto permitimos el día actual y fechas futuras,
  // y dejamos aquí comentado cómo activar el límite de "solo 2 días atrás"
  // si en el futuro el cliente lo pide de forma estricta:
  //
  // const hoy = new Date();
  // const limiteAtras = new Date();
  // limiteAtras.setDate(hoy.getDate() - 2);
  // if (new Date(fecha) < limiteAtras) {
  //   return NextResponse.json(
  //     { error: "No puedes registrar una fecha tan antigua" },
  //     { status: 400 }
  //   );
  // }

  const solicitud = await db.solicitudPasaje.create({
    data: {
      colaboradorId: colaboradorObjetivo.id,
      rutaId: ruta.id,
      fecha: new Date(fecha),
      montoTotal: ruta.valor, // se copia el valor de la ruta al momento de crear (snapshot)
      observaciones: observaciones?.trim() ? observaciones.trim().toUpperCase() : null,
      estado: "PENDIENTE",
      creadoPorUsuarioId: creadaPorSupervisor ? session.id : null,
    },
  });

  return NextResponse.json(solicitud, { status: 201 });
}