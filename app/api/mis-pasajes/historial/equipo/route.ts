// app/api/mis-pasajes/historial/equipo/route.ts
// Si el colaborador de la sesión es supervisor, su equipo (para el filtro
// "Colaborador" del historial). Se pide desde el cliente para que la
// pantalla se muestre de inmediato en vez de bloquear la navegación
// esperando esta consulta en el servidor.

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";
import { obtenerColaboradorPorUsuarioId } from "../../../../../lib/colaboradorSesion";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const colaborador = await obtenerColaboradorPorUsuarioId(session.id);
  if (!colaborador) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const equipo = colaborador.esSupervisor
    ? await db.colaborador.findMany({
        where: { supervisorId: colaborador.id, estado: "ACTIVO" },
        select: { id: true, nombreCompleto: true },
        orderBy: { nombreCompleto: "asc" },
      })
    : [];

  return NextResponse.json({ esSupervisor: colaborador.esSupervisor, equipo });
}
