// app/api/rutas/route.ts
// GET: devuelve SOLO las rutas del sitio+área de un colaborador específico,
// ya formateadas (valor como número normal, label = nombre del área).

import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { getSession } from "../../../lib/auth";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const colaboradorIdParam = searchParams.get("colaboradorId");

  const miColaborador = await db.colaborador.findUnique({
    where: { usuarioId: session.id },
  });
  if (!miColaborador) {
    return NextResponse.json({ error: "Colaborador no encontrado" }, { status: 404 });
  }

  let colaboradorObjetivo = miColaborador;

  if (colaboradorIdParam && colaboradorIdParam !== miColaborador.id) {
    const colaboradorSolicitado = await db.colaborador.findUnique({
      where: { id: colaboradorIdParam },
    });

    const esSuSupervisor =
      miColaborador.esSupervisor &&
      colaboradorSolicitado?.supervisorId === miColaborador.id;

    if (!colaboradorSolicitado || !esSuSupervisor) {
      return NextResponse.json(
        { error: "No tienes permiso para ver las rutas de ese colaborador" },
        { status: 403 }
      );
    }
    colaboradorObjetivo = colaboradorSolicitado;
  }

  // Incluimos el área para poder armar el "label" (antes faltaba)
  const rutas = await db.ruta.findMany({
    where: {
      sitioId: colaboradorObjetivo.sitioId,
      areaId: colaboradorObjetivo.areaId,
      activo: true,
    },
    include: { area: true },
    orderBy: { valor: "asc" },
  });

  // Serializamos: Decimal -> number, y armamos el label con el nombre del área
  // (antes se devolvían las rutas "en crudo", por eso fallaba r.valor.toFixed)
  const rutasSerializadas = rutas.map((r) => ({
    id: r.id,
    valor: Number(r.valor),
    label: r.area.nombre,
  }));

  return NextResponse.json(rutasSerializadas);
}