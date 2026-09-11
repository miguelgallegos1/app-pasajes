// app/api/solicitudes/[id]/pagar/route.ts
// PATCH: Nómina (o Super Admin) marca una solicitud REVISADA como PAGADA.

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !["NOMINA", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;

  // Estado exigido dentro del WHERE del UPDATE: verificación atómica para
  // que un pago no pueda aplicarse sobre una solicitud que otra petición
  // concurrente (ej. un "devolver-revision") acaba de sacar de REVISADO.
  const resultado = await db.solicitudPasaje.updateMany({
    where: { id, estado: "REVISADO" },
    data: { estado: "PAGADA", fechaPago: new Date(), pagadoPorId: session.id },
  });

  if (resultado.count === 0) {
    return NextResponse.json(
      { error: "Solo se pueden pagar solicitudes ya revisadas" },
      { status: 400 }
    );
  }

  const actualizada = await db.solicitudPasaje.findUnique({ where: { id } });
  return NextResponse.json(actualizada);
}