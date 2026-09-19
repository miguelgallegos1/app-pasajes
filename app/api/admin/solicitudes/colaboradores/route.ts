// app/api/admin/solicitudes/colaboradores/route.ts
// Lista de colaboradores para el filtro de "Control de Solicitudes" (solo
// Super Admin). Se pide desde el cliente para que la pantalla se muestre
// de inmediato en vez de bloquear la navegación esperando esta consulta.

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const colaboradores = await db.colaborador.findMany({
    select: { id: true, nombreCompleto: true },
    orderBy: { nombreCompleto: "asc" },
  });

  return NextResponse.json(colaboradores);
}
