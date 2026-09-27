// app/api/solicitudes/eliminar-lote/route.ts
// POST: elimina varias solicitudes a la vez. Mismo permiso que borrar una
// sola (app/api/solicitudes/[id]/route.ts DELETE): el dueño o su
// supervisor, solo mientras esté PENDIENTE o RECHAZADA; Super Admin puede
// sin importar el estado. Las que no califican se omiten en silencio,
// igual que en los demás "-lote" de la app.

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getSession, obtenerFichaPropiaId } from "../../../../lib/auth";

const MAX_POR_LOTE = 500;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { ids } = await req.json().catch(() => ({ ids: null }));
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((v) => typeof v === "string")) {
    return NextResponse.json({ error: "No se seleccionó ninguna solicitud" }, { status: 400 });
  }
  if (ids.length > MAX_POR_LOTE) {
    return NextResponse.json({ error: `Máximo ${MAX_POR_LOTE} solicitudes por vez` }, { status: 400 });
  }

  const esSuperAdmin = session.rol === "SUPER_ADMIN";
  const [miColaborador, fichaPropiaId] = await Promise.all([
    db.colaborador.findUnique({ where: { usuarioId: session.id } }),
    obtenerFichaPropiaId(session),
  ]);
  // Colaborador/supervisor por su cuenta, o usuario administrativo con su
  // ficha vinculada (Mis solicitudes de TH), o Super Admin.
  if (!miColaborador && !fichaPropiaId && !esSuperAdmin) {
    return NextResponse.json({ error: "Colaborador no encontrado" }, { status: 404 });
  }

  const solicitudes = await db.solicitudPasaje.findMany({
    where: { id: { in: ids } },
    include: { colaborador: true },
  });

  const idsElegibles = solicitudes
    .filter((s) => {
      if (esSuperAdmin) return true;
      const esPropietario = s.colaborador.usuarioId === session.id;
      const esSuSupervisor = !!miColaborador?.esSupervisor && s.colaborador.supervisorId === miColaborador.id;
      const esFichaPropia = !!fichaPropiaId && s.colaboradorId === fichaPropiaId;
      const puedeGestionar = esPropietario || esSuSupervisor || esFichaPropia;
      return puedeGestionar && (s.estado === "PENDIENTE" || s.estado === "RECHAZADA");
    })
    .map((s) => s.id);

  if (idsElegibles.length === 0) {
    return NextResponse.json(
      { error: "Ninguna de las solicitudes elegidas se puede eliminar (deben estar pendientes o rechazadas)" },
      { status: 400 }
    );
  }

  // El estado se vuelve a exigir al borrar (atómico): una que se aprobó
  // mientras tanto no se elimina.
  const resultado = await db.solicitudPasaje.deleteMany({
    where: { id: { in: idsElegibles }, ...(esSuperAdmin ? {} : { estado: { in: ["PENDIENTE", "RECHAZADA"] } }) },
  });

  return NextResponse.json({ eliminadas: resultado.count, omitidas: ids.length - resultado.count });
}
