// app/api/rutas/route.ts
// GET: rutas disponibles (con su nombre propio) para el sitio+área de un colaborador.

import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { getSession } from "../../../lib/auth";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const colaboradorIdParam = searchParams.get("colaboradorId");

  const miColaborador = await db.colaborador.findUnique({ where: { usuarioId: session.id } });
  if (!miColaborador) {
    return NextResponse.json({ error: "Colaborador no encontrado" }, { status: 404 });
  }

  let colaboradorObjetivo = miColaborador;

  if (colaboradorIdParam && colaboradorIdParam !== miColaborador.id) {
    const colaboradorSolicitado = await db.colaborador.findUnique({ where: { id: colaboradorIdParam } });
    const esSuSupervisor =
      miColaborador.esSupervisor && colaboradorSolicitado?.supervisorId === miColaborador.id;
    if (!colaboradorSolicitado || !esSuSupervisor) {
      return NextResponse.json(
        { error: "No tienes permiso para ver las rutas de ese colaborador" },
        { status: 403 }
      );
    }
    colaboradorObjetivo = colaboradorSolicitado;
  }

  const rutas = await db.ruta.findMany({
    where: { sitioId: colaboradorObjetivo.sitioId, areaId: colaboradorObjetivo.areaId, activo: true },
    orderBy: { nombre: "asc" },
  });

  const rutasSerializadas = rutas.map((r) => ({ id: r.id, valor: Number(r.valor), label: r.nombre }));

  return NextResponse.json(rutasSerializadas);
}