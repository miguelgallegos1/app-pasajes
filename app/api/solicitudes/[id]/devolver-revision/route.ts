// app/api/solicitudes/[id]/devolver-revision/route.ts
// PATCH: Coordinador (al revisar, si encuentra una discrepancia) o Nómina
// (al pagar, si encuentra una novedad) regresan una solicitud REVISADA de
// vuelta a APROBADA para que se corrija y se vuelva a revisar.

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";
import { obtenerCondicionRutaTH } from "../../../../../lib/alcanceTH";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !["COORDINADOR", "NOMINA", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const { motivo } = await req.json().catch(() => ({ motivo: "" }));

  if (!motivo || motivo.trim().length < 3) {
    return NextResponse.json({ error: "Indica el motivo de la corrección" }, { status: 400 });
  }

  // Nómina no tiene asignaciones por área (igual que hoy), así que solo
  // restringimos el alcance cuando quien devuelve es Coordinador.
  const { sinRestriccion, condicion } =
    session.rol === "COORDINADOR"
      ? await obtenerCondicionRutaTH(session.id, session.rol)
      : { sinRestriccion: true as const, condicion: {} as Record<string, unknown> };
  if (condicion === null) {
    return NextResponse.json({ error: "No tienes áreas asignadas" }, { status: 403 });
  }

  const solicitud = await db.solicitudPasaje.findFirst({
    where: { id, ...(sinRestriccion ? {} : { ruta: condicion }) },
  });
  if (!solicitud || solicitud.estado !== "REVISADO") {
    return NextResponse.json({ error: "Solo se pueden devolver solicitudes revisadas" }, { status: 400 });
  }

  const etiqueta = session.rol === "NOMINA" ? "NOVEDAD EN NÓMINA" : "DISCREPANCIA EN REVISIÓN";
  const notaExistente = solicitud.observaciones ? `${solicitud.observaciones} | ` : "";
  const nuevaObservacion = `${notaExistente}${etiqueta}: ${motivo.trim().toUpperCase()}`;

  // Estado exigido dentro del WHERE del UPDATE: verificación atómica para
  // que no se pise un cambio concurrente (ver revertir/route.ts).
  const resultado = await db.solicitudPasaje.updateMany({
    where: { id, estado: "REVISADO" },
    data: {
      estado: "APROBADA",
      fechaRevision: null,
      revisadoPorId: null,
      observaciones: nuevaObservacion,
    },
  });

  if (resultado.count === 0) {
    return NextResponse.json({ error: "Solo se pueden devolver solicitudes revisadas" }, { status: 400 });
  }

  const actualizada = await db.solicitudPasaje.findUnique({ where: { id } });
  return NextResponse.json(actualizada);
}
