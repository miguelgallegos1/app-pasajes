// app/api/solicitudes/eliminar-lote/route.ts
// POST: elimina varias solicitudes a la vez. Mismo permiso que borrar una
// sola (app/api/solicitudes/[id]/route.ts DELETE): el dueño o su
// supervisor, solo mientras esté PENDIENTE o RECHAZADA; Super Admin puede
// sin importar el estado. Las que no califican se omiten en silencio,
// igual que en los demás "-lote" de la app.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { ids } = await req.json().catch(() => ({ ids: null }));
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((v) => typeof v === "string")) {
    return NextResponse.json({ error: "No se seleccionó ninguna solicitud" }, { status: 400 });
  }

  const miColaborador = await db.colaborador.findUnique({ where: { usuarioId: session.id } });
  if (!miColaborador) return NextResponse.json({ error: "Colaborador no encontrado" }, { status: 404 });

  const esSuperAdmin = session.rol === "SUPER_ADMIN";

  const solicitudes = await db.solicitudPasaje.findMany({
    where: { id: { in: ids } },
    include: { colaborador: true },
  });

  const idsElegibles = solicitudes
    .filter((s) => {
      if (esSuperAdmin) return true;
      const esPropietario = s.colaborador.usuarioId === session.id;
      const esSuSupervisor = miColaborador.esSupervisor && s.colaborador.supervisorId === miColaborador.id;
      const puedeGestionar = esPropietario || esSuSupervisor;
      return puedeGestionar && (s.estado === "PENDIENTE" || s.estado === "RECHAZADA");
    })
    .map((s) => s.id);

  if (idsElegibles.length === 0) {
    return NextResponse.json(
      { error: "Ninguna de las solicitudes elegidas se puede eliminar (deben estar pendientes o rechazadas)" },
      { status: 400 }
    );
  }

  const resultado = await db.solicitudPasaje.deleteMany({ where: { id: { in: idsElegibles } } });

  return NextResponse.json({ eliminadas: resultado.count, omitidas: ids.length - resultado.count });
}
