// app/api/colaboradores/buscar/route.ts
// Búsqueda rápida de colaboradores para la paleta de comandos (Ctrl+K).
// Mismo alcance que la pantalla /th/colaboradores (obtenerCondicionColaboradorTH):
// nunca devuelve a un TH un colaborador fuera de sus áreas asignadas.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { obtenerCondicionColaboradorTH } from "../../../../lib/alcanceTH";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ resultados: [] });

  const { sinRestriccion, condicion } = await obtenerCondicionColaboradorTH(session.id, session.rol);
  if (condicion === null) return NextResponse.json({ resultados: [] });

  const filtroTexto = {
    OR: [
      { nombreCompleto: { contains: q, mode: "insensitive" as const } },
      { codigoNomina: { contains: q, mode: "insensitive" as const } },
    ],
  };

  const colaboradores = await db.colaborador.findMany({
    where: sinRestriccion ? filtroTexto : { AND: [condicion as Record<string, unknown>, filtroTexto] },
    select: { id: true, nombreCompleto: true, codigoNomina: true },
    orderBy: { nombreCompleto: "asc" },
    take: 8,
  });

  return NextResponse.json({
    resultados: colaboradores.map((c) => ({
      id: c.id,
      label: c.nombreCompleto,
      sublabel: c.codigoNomina ?? "Sin código",
    })),
  });
}
