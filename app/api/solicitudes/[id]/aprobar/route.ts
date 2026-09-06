// app/api/solicitudes/[id]/aprobar/route.ts
// PATCH: Talento Humano (o Super Admin) aprueba una solicitud pendiente.

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;

  const solicitud = await db.solicitudPasaje.findUnique({ where: { id } });
  if (!solicitud || solicitud.estado !== "PENDIENTE") {
    return NextResponse.json(
      { error: "Solo se pueden aprobar solicitudes pendientes" },
      { status: 400 }
    );
  }

  const actualizada = await db.solicitudPasaje.update({
    where: { id },
    data: {
      estado: "APROBADA",
      fechaAprobacion: new Date(),
      aprobadoPorId: session.id,
    },
  });

  return NextResponse.json(actualizada);
}