// app/api/solicitudes/[id]/revertir/route.ts
// PATCH: Talento Humano retrocede una solicitud APROBADA de vuelta a
// PENDIENTE, por si se aprobó por error. Coordinación también lo usa para
// reportar una discrepancia al revisar (la devuelve a TH para corregirla).
// No aplica a solicitudes ya PAGADAS (revertir un pago ya hecho es otro
// problema).

import { NextResponse, after } from "next/server";
import { db } from "../../../../../lib/db";
import { getSession } from "../../../../../lib/auth";
import { obtenerCondicionRutaTH } from "../../../../../lib/alcanceTH";
import { notificarCambioEstado } from "../../../../../lib/webPush";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "COORDINADOR", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const { motivo } = await req.json().catch(() => ({ motivo: "" }));

  if (!motivo || motivo.trim().length < 3) {
    return NextResponse.json({ error: "Indica el motivo de la corrección" }, { status: 400 });
  }

  // Con áreas asignadas, TH y Coordinación solo pueden revertir solicitudes
  // de rutas dentro de su propio alcance, igual que en aprobar-lote.
  const { sinRestriccion, condicion } = await obtenerCondicionRutaTH(session.id, session.rol);
  if (condicion === null) {
    return NextResponse.json({ error: "No tienes áreas asignadas" }, { status: 403 });
  }

  const solicitud = await db.solicitudPasaje.findFirst({
    where: { id, ...(sinRestriccion ? {} : { ruta: condicion }) },
  });
  if (!solicitud || solicitud.estado !== "APROBADA") {
    return NextResponse.json({ error: "Solo se pueden revertir solicitudes aprobadas" }, { status: 400 });
  }

  // El "motivo" solo se valida (arriba) y no se guarda: no se mezcla con
  // "observaciones", que es la nota del colaborador y debe seguir viéndose
  // completa en las tablas y al editar, sin acumular texto de
  // administración en cada corrección.

  // Estado exigido dentro del WHERE del UPDATE: verificación atómica para
  // que no se revierta una solicitud que otra petición concurrente (ej.
  // Coordinación revisándola) ya sacó de APROBADA.
  const resultado = await db.solicitudPasaje.updateMany({
    where: { id, estado: "APROBADA" },
    data: {
      estado: "PENDIENTE",
      fechaAprobacion: null,
      aprobadoPorId: null,
    },
  });

  if (resultado.count === 0) {
    return NextResponse.json({ error: "Solo se pueden revertir solicitudes aprobadas" }, { status: 400 });
  }

  const actualizada = await db.solicitudPasaje.findUnique({
    where: { id },
    include: { ruta: { select: { nombre: true } } },
  });
  if (actualizada) {
    after(() =>
      notificarCambioEstado(actualizada.colaboradorId, {
        codigo: actualizada.codigo,
        estado: actualizada.estado,
        rutaLabel: actualizada.ruta.nombre,
      })
    );
  }
  return NextResponse.json(actualizada);
}
