// app/api/admin/parametros/route.ts
// GET/PUT del único parámetro editable por ahora: cuántos días atrás
// puede elegir el calendario de nueva solicitud. Solo Super Admin.

import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/auth";
import { obtenerDiasAtrasSolicitud, actualizarDiasAtrasSolicitud } from "../../../../lib/parametros";

export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const diasAtrasSolicitud = await obtenerDiasAtrasSolicitud();
  return NextResponse.json({ diasAtrasSolicitud });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { diasAtrasSolicitud } = await req.json().catch(() => ({}));
  if (
    typeof diasAtrasSolicitud !== "number" ||
    !Number.isInteger(diasAtrasSolicitud) ||
    diasAtrasSolicitud < 0 ||
    diasAtrasSolicitud > 365
  ) {
    return NextResponse.json({ error: "El valor debe ser un número entero entre 0 y 365" }, { status: 400 });
  }

  await actualizarDiasAtrasSolicitud(diasAtrasSolicitud);
  return NextResponse.json({ diasAtrasSolicitud });
}
