// app/api/solicitudes/[id]/rechazar/route.ts
// PATCH: TH "devuelve" una solicitud para que el colaborador la corrija.
// Se marca como RECHAZADA (para que el colaborador la note claramente),
// y la nota de TH se agrega al MISMO campo "observaciones" que él llenó.
// El colaborador puede editarla; al guardar, vuelve a PENDIENTE.

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
  const { comentario } = await req.json().catch(() => ({ comentario: "" }));

  if (!comentario || comentario.trim().length < 3) {
    return NextResponse.json({ error: "Debes indicar qué corregir" }, { status: 400 });
  }

  const solicitud = await db.solicitudPasaje.findUnique({ where: { id } });
  if (!solicitud || solicitud.estado !== "PENDIENTE") {
    return NextResponse.json({ error: "Solo se pueden devolver solicitudes pendientes" }, { status: 400 });
  }

  const notaExistente = solicitud.observaciones ? `${solicitud.observaciones} | ` : "";
  const nuevaObservacion = `${notaExistente}CORRECCIÓN SOLICITADA: ${comentario.trim().toUpperCase()}`;

  const actualizada = await db.solicitudPasaje.update({
    where: { id },
    data: {
      estado: "RECHAZADA",
      observaciones: nuevaObservacion,
    },
  });

  return NextResponse.json(actualizada);
}