// app/api/equipo/route.ts
// GET: si el usuario logueado es Supervisor, devuelve la lista de
// colaboradores que tiene a su cargo (para el selector del formulario).

import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { getSession } from "../../../lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const miColaborador = await db.colaborador.findUnique({
    where: { usuarioId: session.id },
  });

  if (!miColaborador || !miColaborador.esSupervisor) {
    // No es supervisor: no tiene equipo, devolvemos lista vacía (no es un error)
    return NextResponse.json([]);
  }

  const equipo = await db.colaborador.findMany({
    where: { supervisorId: miColaborador.id, estado: "ACTIVO" },
    select: { id: true, nombreCompleto: true },
    orderBy: { nombreCompleto: "asc" },
  });

  return NextResponse.json(equipo);
}