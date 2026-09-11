// app/api/solicitudes/[id]/rechazar/route.ts
// PATCH: TH "devuelve" una solicitud para que el colaborador la corrija.
// Se marca como RECHAZADA (para que el colaborador la note claramente),
// y la nota de TH se agrega al MISMO campo "observaciones" que él llenó.
// El colaborador puede editarla; al guardar, vuelve a PENDIENTE.

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";
import { obtenerCondicionRutaTH } from "../../../../../lib/alcanceTH";

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

  // Un TH con áreas asignadas solo puede devolver solicitudes de rutas
  // dentro de su alcance, igual que en aprobar-lote.
  const { sinRestriccion, condicion } = await obtenerCondicionRutaTH(session.id, session.rol);
  if (condicion === null) {
    return NextResponse.json({ error: "No tienes áreas asignadas" }, { status: 403 });
  }

  const solicitud = await db.solicitudPasaje.findFirst({
    where: { id, ...(sinRestriccion ? {} : { ruta: condicion }) },
  });
  if (!solicitud || solicitud.estado !== "PENDIENTE") {
    return NextResponse.json({ error: "Solo se pueden devolver solicitudes pendientes" }, { status: 400 });
  }

  const notaExistente = solicitud.observaciones ? `${solicitud.observaciones} | ` : "";
  const nuevaObservacion = `${notaExistente}CORRECCIÓN SOLICITADA: ${comentario.trim().toUpperCase()}`;

  // Estado exigido dentro del WHERE del UPDATE: verificación atómica para
  // que no se sobreescriba una solicitud que otra petición concurrente ya
  // sacó de PENDIENTE (por ejemplo, si TH la aprobó al mismo tiempo).
  const resultado = await db.solicitudPasaje.updateMany({
    where: { id, estado: "PENDIENTE" },
    data: {
      estado: "RECHAZADA",
      observaciones: nuevaObservacion,
    },
  });

  if (resultado.count === 0) {
    return NextResponse.json({ error: "Solo se pueden devolver solicitudes pendientes" }, { status: 400 });
  }

  const actualizada = await db.solicitudPasaje.findUnique({ where: { id } });
  return NextResponse.json(actualizada);
}