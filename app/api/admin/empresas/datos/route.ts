// app/api/admin/empresas/datos/route.ts
// Árbol completo de Empresas -> Sitios -> Áreas (solo Super Admin). Se
// pide desde el cliente para que la pantalla se muestre de inmediato en
// vez de bloquear la navegación esperando esta consulta en el servidor.

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const empresas = await db.empresa.findMany({
    orderBy: { numero: "asc" },
    include: {
      sitios: {
        orderBy: { nombre: "asc" },
        include: { areas: { orderBy: { nombre: "asc" } } },
      },
    },
  });

  return NextResponse.json(empresas);
}
