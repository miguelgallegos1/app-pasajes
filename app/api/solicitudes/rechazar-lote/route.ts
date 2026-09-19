// app/api/solicitudes/rechazar-lote/route.ts
// POST: TH "devuelve" VARIAS solicitudes a la vez para que el colaborador
// las corrija (ver [id]/rechazar/route.ts). Cada una conserva su propia
// nota anterior, así que la actualización va fila por fila dentro de una
// transacción — no un solo updateMany con el mismo dato para todas.

import { NextResponse, after } from "next/server";
import { db } from "../../../../lib/db";
import { getSession } from "../../../../lib/auth";
import { obtenerCondicionRutaTH } from "../../../../lib/alcanceTH";
import { notificarCambioEstadoLote } from "../../../../lib/webPush";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !["ADMIN_TH", "SUPER_ADMIN"].includes(session.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { ids, comentario } = await req.json().catch(() => ({ ids: null, comentario: "" }));
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((v) => typeof v === "string")) {
    return NextResponse.json({ error: "No se enviaron solicitudes" }, { status: 400 });
  }
  if (!comentario || comentario.trim().length < 3) {
    return NextResponse.json({ error: "Debes indicar qué corregir" }, { status: 400 });
  }

  const { sinRestriccion, condicion } = await obtenerCondicionRutaTH(session.id, session.rol);
  if (condicion === null) {
    return NextResponse.json({ error: "No tienes áreas asignadas" }, { status: 403 });
  }

  const solicitudesValidas = await db.solicitudPasaje.findMany({
    where: {
      id: { in: ids },
      estado: "PENDIENTE",
      ...(sinRestriccion ? {} : { ruta: condicion }),
    },
    select: { id: true, observaciones: true },
  });

  if (solicitudesValidas.length === 0) {
    return NextResponse.json({ error: "Ninguna de las solicitudes es válida para devolver" }, { status: 400 });
  }

  const comentarioLimpio = comentario.trim().toUpperCase();
  const idsValidos = solicitudesValidas.map((s) => s.id);

  // Estado exigido dentro del WHERE de cada UPDATE: verificación atómica
  // por fila (ver aprobar-lote/route.ts) para que ninguna se pise con un
  // cambio concurrente.
  const resultados = await db.$transaction(
    solicitudesValidas.map((s) => {
      const notaExistente = s.observaciones ? `${s.observaciones} | ` : "";
      return db.solicitudPasaje.updateMany({
        where: { id: s.id, estado: "PENDIENTE" },
        data: {
          estado: "RECHAZADA",
          observaciones: `${notaExistente}CORRECCIÓN SOLICITADA: ${comentarioLimpio}`,
        },
      });
    })
  );
  const count = resultados.reduce((acc, r) => acc + r.count, 0);

  after(async () => {
    const rechazadas = await db.solicitudPasaje.findMany({
      where: { id: { in: idsValidos }, estado: "RECHAZADA" },
      select: { colaboradorId: true, estado: true },
    });
    await notificarCambioEstadoLote(rechazadas);
  });

  return NextResponse.json({ rechazadas: count });
}
