// app/api/solicitudes/[id]/revertir/route.ts
// PATCH: Talento Humano (o Super Admin) retrocede una solicitud APROBADA
// de vuelta a PENDIENTE, por si se aprobó por error. No aplica a
// solicitudes ya PAGADAS (revertir un pago ya hecho es otro problema).

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const { motivo } = await req.json().catch(() => ({ motivo: "" }));

  if (!motivo || motivo.trim().length < 3) {
    return NextResponse.json({ error: "Indica el motivo de la corrección" }, { status: 400 });
  }

  const solicitud = await db.solicitudPasaje.findUnique({ where: { id } });
  if (!solicitud || solicitud.estado !== "APROBADA") {
    return NextResponse.json({ error: "Solo se pueden revertir solicitudes aprobadas" }, { status: 400 });
  }

  const notaExistente = solicitud.observaciones ? `${solicitud.observaciones} | ` : "";
  const nuevaObservacion = `${notaExistente}REVERTIDA A PENDIENTE: ${motivo.trim().toUpperCase()}`;

  const actualizada = await db.solicitudPasaje.update({
    where: { id },
    data: {
      estado: "PENDIENTE",
      fechaAprobacion: null,
      aprobadoPorId: null,
      observaciones: nuevaObservacion,
    },
  });

  return NextResponse.json(actualizada);
}
