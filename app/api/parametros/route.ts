// app/api/parametros/route.ts
// GET: parámetros globales que necesita cualquier pantalla autenticada
// (por ahora, el límite de días atrás del calendario de nueva solicitud).
// La edición vive en /api/admin/parametros, solo para Super Admin.

import { NextResponse } from "next/server";
import { getSession } from "../../../lib/auth";
import { obtenerDiasAtrasSolicitud } from "../../../lib/parametros";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const diasAtrasSolicitud = await obtenerDiasAtrasSolicitud();
  return NextResponse.json({ diasAtrasSolicitud });
}
