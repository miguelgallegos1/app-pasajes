// app/api/solicitudes/[id]/pagar/route.ts
// PATCH: Finanzas (o Super Admin) marca una solicitud APROBADA como PAGADA.

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !["FINANZAS", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;

  const solicitud = await db.solicitudPasaje.findUnique({ where: { id } });
  if (!solicitud || solicitud.estado !== "APROBADA") {
    return NextResponse.json(
      { error: "Solo se pueden pagar solicitudes ya aprobadas" },
      { status: 400 }
    );
  }

  const actualizada = await db.solicitudPasaje.update({
    where: { id },
    data: { estado: "PAGADA", fechaPago: new Date(), pagadoPorId: session.id },
  });

  return NextResponse.json(actualizada);
}